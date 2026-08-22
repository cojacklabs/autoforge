import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface WorktreeProvisionResult {
  branch: string;
  path: string;
}

export interface WorktreeManager {
  provision(
    projectRoot: string,
    workId: string,
    assignmentId: string,
  ): Promise<WorktreeProvisionResult>;
  cleanup?(projectRoot: string, worktreePath: string): Promise<void>;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .slice(0, 80);
}

export class GitWorktreeManager implements WorktreeManager {
  private readonly root: string;

  constructor(root?: string) {
    this.root = root
      ? path.resolve(root)
      : process.env.AUTOFORGE_HOME
        ? path.resolve(process.env.AUTOFORGE_HOME)
        : path.join(homedir(), ".autoforge");
  }

  async provision(
    projectRoot: string,
    workId: string,
    assignmentId: string,
  ): Promise<WorktreeProvisionResult> {
    const projectKey = createHash("sha256")
      .update(path.resolve(projectRoot))
      .digest("hex")
      .slice(0, 16);
    const suffix = assignmentId.slice("assignment.".length, 20);
    const branch = `autoforge/${slug(workId)}/${slug(suffix)}`;
    const worktreePath = path.join(
      this.root,
      "worktrees",
      projectKey,
      slug(assignmentId),
    );
    await execFileAsync("git", [
      "-C",
      projectRoot,
      "worktree",
      "add",
      "-b",
      branch,
      worktreePath,
      "HEAD",
    ]);
    return { branch, path: worktreePath };
  }

  async cleanup(projectRoot: string, worktreePath: string): Promise<void> {
    await execFileAsync("git", [
      "-C",
      projectRoot,
      "worktree",
      "remove",
      worktreePath,
    ]);
  }
}
