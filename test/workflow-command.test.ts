import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runWorkflowCommand } from "../src/commands/workflow.js";
import { EXIT_CODE } from "../src/core/errors.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("workflow command", () => {
  it("starts, shows, and advances a workflow", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runWorkflowCommand({
        args: ["start", "feature.checkout", "feature-development"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "{}").currentStage,
    ).toBe("research");
    await expect(
      runWorkflowCommand({
        args: ["advance", "feature.checkout"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      runWorkflowCommand({
        args: ["show", "feature.checkout"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls[2]?.[0] ?? "{}").currentStage,
    ).toBe("planning");
  });
});
