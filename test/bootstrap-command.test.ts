import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { runBootstrapCommand } from "../src/commands/bootstrap.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("bootstrap command", () => {
  it("prints a readiness report", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-command-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["inspect"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"nextAction": "initialize"'),
    );
  });
});
