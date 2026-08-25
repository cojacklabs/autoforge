import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runTuiCommand } from "../src/commands/tui.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-tui-"));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, ".git"));
  await initializeProject({ projectRoot: directory });
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("deprecated TUI compatibility alias", () => {
  it("maps bare tui to concise status without mutating work", async () => {
    const projectRoot = await createProject();
    const before = await createWorkStateStore(projectRoot).read();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runTuiCommand({ args: [], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("AutoForge —"),
    );
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("AutoForge Agent"),
    );
    await expect(createWorkStateStore(projectRoot).read()).resolves.toEqual(
      before,
    );
  });

  it.each([
    { legacy: "dashboard", heading: "AutoForge TUI (deprecated) —" },
    { legacy: "active-work", heading: "AutoForge work —" },
    { legacy: "health", heading: "AutoForge TUI (deprecated) —" },
    { legacy: "next", heading: "AutoForge next —" },
  ])("maps legacy $legacy snapshots to status", async ({ legacy, heading }) => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTuiCommand({
        args: ["--snapshot", "--view", legacy, "--no-color"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining(heading),
    );
  });

  it("rejects unknown views without loading project state", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTuiCommand({
        args: ["--view", "unknown"],
        output,
        startDirectory: "/missing",
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("Usage:"),
    );
    expect(output.stdout).not.toHaveBeenCalled();
  });
});
