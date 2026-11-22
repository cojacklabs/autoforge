import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it, vi } from "vitest";

import { GitWorktreeManager } from "../src/orchestration/worktrees.js";

const execFileAsync = promisify(execFile);
const directories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
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

describe("orchestration worktree home directory", () => {
  const homeOf = (manager: GitWorktreeManager): string =>
    (manager as unknown as { root: string }).root;

  it("prefers PRIOZAR_HOME over the deprecated AUTOFORGE_HOME", () => {
    vi.stubEnv("PRIOZAR_HOME", "/tmp/priozar-home");
    vi.stubEnv("AUTOFORGE_HOME", "/tmp/autoforge-home");
    expect(homeOf(new GitWorktreeManager())).toBe(
      path.resolve("/tmp/priozar-home"),
    );
  });

  it("still honours AUTOFORGE_HOME when PRIOZAR_HOME is unset", () => {
    vi.stubEnv("PRIOZAR_HOME", "");
    delete process.env.PRIOZAR_HOME;
    vi.stubEnv("AUTOFORGE_HOME", "/tmp/autoforge-home");
    expect(homeOf(new GitWorktreeManager())).toBe(
      path.resolve("/tmp/autoforge-home"),
    );
  });
});
