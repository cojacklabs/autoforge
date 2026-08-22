import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { GitWorktreeManager } from "../src/orchestration/worktrees.js";

const execFileAsync = promisify(execFile);
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("orchestration Git worktrees", () => {
  it("provisions an isolated branch outside the project checkout", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-worktree-"));
    directories.push(root);
    const projectRoot = path.join(root, "project");
    const workspaceRoot = path.join(root, "global");
    await execFileAsync("git", ["init", projectRoot]);
    await writeFile(path.join(projectRoot, "README.md"), "project\n");
    await execFileAsync("git", ["-C", projectRoot, "add", "README.md"]);
    await execFileAsync("git", [
      "-C",
      projectRoot,
      "-c",
      "user.name=AutoForge Tests",
      "-c",
      "user.email=tests@autoforge.local",
      "commit",
      "-m",
      "initial",
    ]);

    const result = await new GitWorktreeManager(workspaceRoot).provision(
      projectRoot,
      "task.parallel",
      "assignment.test-1",
    );

    expect(result.path.startsWith(workspaceRoot)).toBe(true);
    expect(result.branch).toContain("task.parallel");
    await expect(
      readFile(path.join(result.path, "README.md"), "utf8"),
    ).resolves.toBe("project\n");
    await new GitWorktreeManager(workspaceRoot).cleanup(
      projectRoot,
      result.path,
    );
    await expect(
      readFile(path.join(result.path, "README.md"), "utf8"),
    ).rejects.toThrow();
  });
});
