import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runLearningCommand } from "../src/commands/learning.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("learning dispatcher", () => {
  it("routes to the hypothesis sub-command", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-learning-dispatch-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["hypothesis", "list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("routes to the experiment sub-command", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-learning-dispatch-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["experiment", "list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("routes to the evidence sub-command", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-learning-dispatch-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["evidence", "list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("rejects an unknown sub-command", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningCommand({
        args: ["bogus"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
