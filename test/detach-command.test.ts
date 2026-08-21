import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runAttachCommand } from "../src/commands/attach.js";
import { runDetachCommand } from "../src/commands/detach.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("detach command", () => {
  it("removes only the global registration", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-detach-home-"),
    );
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-detach-project-"),
    );
    directories.push(home, project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runAttachCommand({ args: [project], output, homeDirectory: home });

    await expect(
      runDetachCommand({ args: [project], output, homeDirectory: home }),
    ).resolves.toBe(0);
    expect(
      await readFile(path.join(project, ".autoforge", "config.json"), "utf8"),
    ).toContain("projectId");
    expect(
      await readFile(path.join(home, ".autoforge", "config.json"), "utf8"),
    ).not.toContain(project);
  });
});
