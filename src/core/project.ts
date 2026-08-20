import { stat } from "node:fs/promises";
import path from "node:path";

import { AutoForgeError, EXIT_CODE, ProjectNotFoundError } from "./errors.js";

export type ProjectMarker = "autoforge" | "git" | "package";

export interface ProjectRoot {
  path: string;
  marker: ProjectMarker;
}

export interface DiscoverProjectOptions {
  startDirectory: string;
}

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await stat(candidatePath);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      return false;
    }

    throw new AutoForgeError(
      "FILESYSTEM_ERROR",
      `Unable to inspect ${candidatePath}`,
      {
        cause: error,
        details: { path: candidatePath },
        exitCode: EXIT_CODE.filesystem,
      },
    );
  }
}

async function resolveStartDirectory(startPath: string): Promise<string> {
  const absolutePath = path.resolve(startPath);

  try {
    const startStat = await stat(absolutePath);
    return startStat.isDirectory() ? absolutePath : path.dirname(absolutePath);
  } catch (error) {
    throw new AutoForgeError(
      "FILESYSTEM_ERROR",
      `Unable to access project search path ${absolutePath}`,
      {
        cause: error,
        details: { path: absolutePath },
        exitCode: EXIT_CODE.filesystem,
      },
    );
  }
}

export async function discoverProjectRoot(
  options: DiscoverProjectOptions,
): Promise<ProjectRoot> {
  const startDirectory = await resolveStartDirectory(options.startDirectory);
  let currentDirectory = startDirectory;
  let packageFallback: ProjectRoot | undefined;

  while (true) {
    if (await pathExists(path.join(currentDirectory, ".autoforge"))) {
      return { path: currentDirectory, marker: "autoforge" };
    }

    if (await pathExists(path.join(currentDirectory, ".git"))) {
      return { path: currentDirectory, marker: "git" };
    }

    if (
      !packageFallback &&
      (await pathExists(path.join(currentDirectory, "package.json")))
    ) {
      packageFallback = { path: currentDirectory, marker: "package" };
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  if (packageFallback) {
    return packageFallback;
  }

  throw new ProjectNotFoundError(startDirectory);
}
