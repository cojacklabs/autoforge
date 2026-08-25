import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runAttachCommand } from "../src/commands/attach.js";
import { initializeProject } from "../src/commands/init.js";
import { inspectAttachment } from "../src/workspace/attach-inspection.js";

const execFileAsync = promisify(execFile);

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("attach command", () => {
  it("initializes and registers a project", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-home-"),
    );
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-project-"),
    );
    directories.push(home, project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runAttachCommand({ args: [project], output, homeDirectory: home }),
    ).resolves.toBe(0);
    expect(
      await readFile(path.join(project, ".autoforge", "config.json"), "utf8"),
    ).toContain("projectId");
    expect(
      await readFile(path.join(home, ".autoforge", "config.json"), "utf8"),
    ).toContain(project);
  });

  it("resolves a nested path to its enclosing Git repository root", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-home-"),
    );
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-project-"),
    );
    const nested = path.join(project, "app-frontend", "src");
    directories.push(home, project);
    await mkdir(nested, { recursive: true });
    await execFileAsync("git", ["init", project]);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runAttachCommand({ args: [nested], output, homeDirectory: home }),
    ).resolves.toBe(0);
    await expect(
      access(path.join(project, ".autoforge")),
    ).resolves.toBeUndefined();
    await expect(access(path.join(nested, ".autoforge"))).rejects.toThrow();
    expect(
      await readFile(path.join(home, ".autoforge", "config.json"), "utf8"),
    ).toContain(project);
  });

  it("dry-runs without project or global writes", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-home-"),
    );
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-project-"),
    );
    const nested = path.join(project, "packages", "app");
    directories.push(home, project);
    await mkdir(nested, { recursive: true });
    await execFileAsync("git", ["init", project]);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runAttachCommand({
        args: [nested, "--dry-run", "--json"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    const result = JSON.parse(output.stdout.mock.calls[0]?.[0] as string);
    expect(result.data).toMatchObject({
      resolvedRoot: await realpath(project),
      repositoryKind: "git",
      actions: ["initialize", "register"],
      conflicts: [],
    });
    await expect(access(path.join(project, ".autoforge"))).rejects.toThrow();
    await expect(access(path.join(home, ".autoforge"))).rejects.toThrow();
  });

  it("uses the exact supplied directory outside Git", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-home-"),
    );
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-project-"),
    );
    directories.push(home, project);

    await expect(inspectAttachment(project, home)).resolves.toMatchObject({
      requestedPath: project,
      resolvedRoot: project,
      repositoryKind: "non-git",
    });
  });

  it("maps linked worktrees back to the owning project root", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-home-"),
    );
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-project-"),
    );
    const worktree = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-worktree-"),
    );
    directories.push(home, project, worktree);
    await execFileAsync("git", ["init", project]);
    await execFileAsync("git", [
      "-C",
      project,
      "config",
      "user.email",
      "test@example.com",
    ]);
    await execFileAsync("git", [
      "-C",
      project,
      "config",
      "user.name",
      "AutoForge Test",
    ]);
    await execFileAsync("git", [
      "-C",
      project,
      "commit",
      "--allow-empty",
      "-m",
      "initial",
    ]);
    await rm(worktree, { recursive: true, force: true });
    await execFileAsync("git", [
      "-C",
      project,
      "worktree",
      "add",
      worktree,
      "-b",
      "status-test",
    ]);

    await expect(inspectAttachment(worktree, home)).resolves.toMatchObject({
      requestedPath: worktree,
      resolvedRoot: await realpath(project),
      repositoryKind: "worktree",
    });
  });

  it("treats Git submodules as independent repository roots", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-home-"),
    );
    const superproject = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-superproject-"),
    );
    const source = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-submodule-source-"),
    );
    directories.push(home, superproject, source);
    for (const repository of [superproject, source]) {
      await execFileAsync("git", ["init", repository]);
      await execFileAsync("git", [
        "-C",
        repository,
        "config",
        "user.email",
        "test@example.com",
      ]);
      await execFileAsync("git", [
        "-C",
        repository,
        "config",
        "user.name",
        "AutoForge Test",
      ]);
      await execFileAsync("git", [
        "-C",
        repository,
        "commit",
        "--allow-empty",
        "-m",
        "initial",
      ]);
    }
    await execFileAsync("git", [
      "-c",
      "protocol.file.allow=always",
      "-C",
      superproject,
      "submodule",
      "add",
      source,
      "packages/module",
    ]);
    const submodule = path.join(superproject, "packages", "module");

    await expect(inspectAttachment(submodule, home)).resolves.toMatchObject({
      requestedPath: submodule,
      resolvedRoot: await realpath(submodule),
      repositoryKind: "submodule",
    });
  });

  it("reports nested AutoForge state as a dry-run conflict", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-home-"),
    );
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-attach-project-"),
    );
    const nested = path.join(project, "app-frontend");
    directories.push(home, project);
    await mkdir(nested, { recursive: true });
    await execFileAsync("git", ["init", project]);
    await initializeProject({ projectRoot: nested });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runAttachCommand({
        args: [nested, "--dry-run"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(5);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("Nested AutoForge state exists"),
    );
  });
});
