import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

import { AutoForgeError, EXIT_CODE } from "./errors.js";

export interface ResolvedProjectPath {
  absolutePath: string;
  canonicalPath: string;
  relativePath: string;
}

function invalidPath(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_ARGUMENT", message, {
    details,
    exitCode: EXIT_CODE.usage,
  });
}

function isPortableAbsolutePath(candidatePath: string): boolean {
  return (
    path.isAbsolute(candidatePath) ||
    /^[a-zA-Z]:[\\/]/.test(candidatePath) ||
    /^[/\\]{2}/.test(candidatePath)
  );
}

export function normalizeProjectRelativePath(candidatePath: string): string {
  if (candidatePath.length === 0) {
    throw invalidPath("Project-relative path cannot be empty", {
      path: candidatePath,
    });
  }

  if (candidatePath.includes("\0")) {
    throw invalidPath("Project-relative path cannot contain a null byte", {
      path: candidatePath,
    });
  }

  if (isPortableAbsolutePath(candidatePath)) {
    throw invalidPath("Expected a project-relative path", {
      path: candidatePath,
    });
  }

  const portablePath = candidatePath.replaceAll("\\", "/");
  const normalizedPath = path.posix.normalize(portablePath);

  if (normalizedPath === ".." || normalizedPath.startsWith("../")) {
    throw invalidPath("Project-relative path escapes the project root", {
      path: candidatePath,
    });
  }

  return normalizedPath.replace(/^\.\//, "");
}

export function isPathContained(
  rootPath: string,
  candidatePath: string,
): boolean {
  const relativePath = path.relative(
    path.resolve(rootPath),
    path.resolve(candidatePath),
  );

  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

export function resolveProjectPath(
  projectRoot: string,
  projectRelativePath: string,
): string {
  const normalizedPath = normalizeProjectRelativePath(projectRelativePath);
  const absoluteRoot = path.resolve(projectRoot);
  const absolutePath = path.resolve(absoluteRoot, normalizedPath);

  if (!isPathContained(absoluteRoot, absolutePath)) {
    throw invalidPath("Resolved path escapes the project root", {
      path: projectRelativePath,
      projectRoot: absoluteRoot,
    });
  }

  return absolutePath;
}

async function pathEntryExists(candidatePath: string): Promise<boolean> {
  try {
    await lstat(candidatePath);
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

async function canonicalizePotentialPath(
  candidatePath: string,
): Promise<string> {
  let existingAncestor = candidatePath;
  const missingSegments: string[] = [];

  while (!(await pathEntryExists(existingAncestor))) {
    const parentPath = path.dirname(existingAncestor);
    if (parentPath === existingAncestor) {
      throw new AutoForgeError(
        "FILESYSTEM_ERROR",
        `Unable to find an existing ancestor for ${candidatePath}`,
        {
          details: { path: candidatePath },
          exitCode: EXIT_CODE.filesystem,
        },
      );
    }

    missingSegments.unshift(path.basename(existingAncestor));
    existingAncestor = parentPath;
  }

  try {
    const canonicalAncestor = await realpath(existingAncestor);
    return path.resolve(canonicalAncestor, ...missingSegments);
  } catch (error) {
    throw new AutoForgeError(
      "FILESYSTEM_ERROR",
      `Unable to resolve ${existingAncestor}`,
      {
        cause: error,
        details: { path: existingAncestor },
        exitCode: EXIT_CODE.filesystem,
      },
    );
  }
}

export async function resolveContainedProjectPath(
  projectRoot: string,
  candidatePath: string,
): Promise<ResolvedProjectPath> {
  const absoluteRoot = path.resolve(projectRoot);
  if (
    isPortableAbsolutePath(candidatePath) &&
    !path.isAbsolute(candidatePath)
  ) {
    throw invalidPath("Absolute path syntax does not match this platform", {
      path: candidatePath,
    });
  }

  const absolutePath = isPortableAbsolutePath(candidatePath)
    ? path.resolve(candidatePath)
    : resolveProjectPath(absoluteRoot, candidatePath);

  if (!isPathContained(absoluteRoot, absolutePath)) {
    throw invalidPath("Path is outside the project root", {
      path: candidatePath,
      projectRoot: absoluteRoot,
    });
  }

  const canonicalRoot = await canonicalizePotentialPath(absoluteRoot);
  const canonicalPath = await canonicalizePotentialPath(absolutePath);

  if (!isPathContained(canonicalRoot, canonicalPath)) {
    throw invalidPath("Path resolves outside the project root", {
      path: candidatePath,
      projectRoot: absoluteRoot,
      canonicalPath,
    });
  }

  return {
    absolutePath,
    canonicalPath,
    relativePath: path
      .relative(canonicalRoot, canonicalPath)
      .split(path.sep)
      .join("/"),
  };
}
