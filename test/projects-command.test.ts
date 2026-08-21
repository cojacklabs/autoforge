import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runProjectsCommand } from "../src/commands/projects.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("projects command", () => {
  it("requires the configured global home and lists registered projects", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-projects-command-"),
    );
    directories.push(home);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await mkdir(path.join(home, "project"));
    await expect(
      runProjectsCommand({
        args: ["register", path.join(home, "project")],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    await expect(
      runProjectsCommand({ args: ["list"], output, homeDirectory: home }),
    ).resolves.toBe(0);
    expect(output.stdout.mock.calls[1]?.[0]).toContain(
      path.join(home, "project"),
    );
  });

  it("treats the bare command as list", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-projects-command-"),
    );
    directories.push(home);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runProjectsCommand({ args: [], output, homeDirectory: home }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith("");
    expect(output.stderr).not.toHaveBeenCalled();
  });

  it("prunes inaccessible registry entries", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-projects-command-"),
    );
    directories.push(home);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["register", path.join(home, "missing")],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    await expect(
      runProjectsCommand({ args: ["prune"], output, homeDirectory: home }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenLastCalledWith(
      "Pruned registry. Total projects: 0.",
    );
  });
});
