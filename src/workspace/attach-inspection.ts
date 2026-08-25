import { execFile } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { AttachmentInspection } from "@cojacklabs/autoforge-sdk";

import { inspectInstallation } from "../commands/init.js";
import { GlobalWorkspaceStore } from "./global-store.js";

const execFileAsync = promisify(execFile);

async function git(
  projectPath: string,
  args: readonly string[],
): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", projectPath, ...args], {
    encoding: "utf8",
  });
  return stdout.trim();
}

async function inspectGitRoot(
  requestedPath: string,
): Promise<Pick<AttachmentInspection, "repositoryKind" | "resolvedRoot">> {
  try {
    if (
      (await git(requestedPath, ["rev-parse", "--is-inside-work-tree"])) !==
      "true"
    ) {
      return { repositoryKind: "non-git", resolvedRoot: requestedPath };
    }
    const worktreeRoot = await git(requestedPath, [
      "rev-parse",
      "--path-format=absolute",
      "--show-toplevel",
    ]);
    const superprojectRoot = await git(requestedPath, [
      "rev-parse",
      "--path-format=absolute",
      "--show-superproject-working-tree",
    ]);
    if (superprojectRoot) {
      return {
        repositoryKind: "submodule",
        resolvedRoot: await realpath(worktreeRoot),
      };
    }
    const [gitDirectory, commonDirectory] = await Promise.all([
      git(requestedPath, ["rev-parse", "--path-format=absolute", "--git-dir"]),
      git(requestedPath, [
        "rev-parse",
        "--path-format=absolute",
        "--git-common-dir",
      ]),
    ]);
    if (gitDirectory !== commonDirectory) {
      return {
        repositoryKind: "worktree",
        resolvedRoot: await realpath(path.dirname(commonDirectory)),
      };
    }
    return {
      repositoryKind: "git",
      resolvedRoot: await realpath(worktreeRoot),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw error;
    }
    return { repositoryKind: "non-git", resolvedRoot: requestedPath };
  }
}

export async function inspectAttachment(
  requested: string,
  homeDirectory?: string,
): Promise<AttachmentInspection> {
  const absolute = path.resolve(requested);
  const requestedStat = await stat(absolute);
  if (!requestedStat.isDirectory()) {
    throw new Error(`Attachment path is not a directory: ${absolute}`);
  }
  const requestedPath = absolute;
  const gitInspection = await inspectGitRoot(requestedPath);
  const resolvedRoot = gitInspection.resolvedRoot;
  const [installation, requestedInstallation, workspace] = await Promise.all([
    inspectInstallation(resolvedRoot),
    requestedPath === resolvedRoot
      ? Promise.resolve(undefined)
      : inspectInstallation(requestedPath),
    new GlobalWorkspaceStore(homeDirectory).read().catch(() => undefined),
  ]);
  const registered = workspace?.projects.includes(resolvedRoot) ?? false;
  const conflicts: string[] = [];
  if (
    requestedInstallation &&
    requestedInstallation.status !== "absent" &&
    requestedInstallation.directory !== installation.directory
  ) {
    conflicts.push(
      `Nested AutoForge state exists at ${requestedInstallation.directory}; move or remove it before attaching the repository root.`,
    );
  }
  if (
    requestedPath !== resolvedRoot &&
    (workspace?.projects.includes(requestedPath) ?? false)
  ) {
    conflicts.push(
      `The requested nested path is already registered separately: ${requestedPath}`,
    );
  }
  if (installation.status === "partial") {
    conflicts.push(
      `AutoForge state at ${installation.directory} is partial and requires repair.`,
    );
  }
  return {
    requestedPath,
    resolvedRoot,
    repositoryKind: gitInspection.repositoryKind,
    installationStatus: installation.status,
    registrationStatus: registered ? "registered" : "unregistered",
    actions: [
      ...(installation.status === "absent" ? (["initialize"] as const) : []),
      ...(!registered ? (["register"] as const) : []),
    ],
    conflicts,
  };
}
