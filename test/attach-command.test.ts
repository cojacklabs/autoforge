import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runAttachCommand } from "../src/commands/attach.js";

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
});
