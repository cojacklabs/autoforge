import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runLearningHypothesisCommand } from "../src/commands/learning-hypothesis.js";
import { runLearningExperimentCommand } from "../src/commands/learning-experiment.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-learning-experiment-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return { projectRoot };
}

async function recordHypothesis(projectRoot: string) {
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  await runLearningHypothesisCommand({
    args: [
      "add",
      "--statement",
      "A shorter onboarding flow increases activation.",
      "--expected-outcome",
      "New users reach first value faster.",
      "--metric",
      "activation rate",
      "--target",
      ">= 40% within 7 days",
    ],
    output,
    startDirectory: projectRoot,
  });
  return "hypothesis.a-shorter-onboarding-flow-increases-activation";
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("learning experiment command", () => {
  it("adds, lists, and shows an experiment", async () => {
    const { projectRoot } = await createFixture();
    const hypothesisId = await recordHypothesis(projectRoot);

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningExperimentCommand({
        args: ["add", "--hypothesis", hypothesisId, "--method", "A/B test"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const listOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningExperimentCommand({
        args: ["list"],
        output: listOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(listOutput.stdout.mock.calls[0]?.[0]).toContain(
      "experiment.a-b-test",
    );

    const showOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningExperimentCommand({
        args: ["show", "experiment.a-b-test"],
        output: showOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(showOutput.stdout.mock.calls[0]?.[0] ?? "{}").status,
    ).toBe("planned");
  });

  it("supports multiple --hypothesis flags", async () => {
    const { projectRoot } = await createFixture();
    const hypothesisId = await recordHypothesis(projectRoot);

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningExperimentCommand({
        args: [
          "add",
          "--hypothesis",
          hypothesisId,
          "--hypothesis",
          hypothesisId,
          "--method",
          "A/B test",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("completes an experiment", async () => {
    const { projectRoot } = await createFixture();
    const hypothesisId = await recordHypothesis(projectRoot);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runLearningExperimentCommand({
      args: ["add", "--hypothesis", hypothesisId, "--method", "A/B test"],
      output,
      startDirectory: projectRoot,
    });
    await expect(
      runLearningExperimentCommand({
        args: ["complete", "experiment.a-b-test"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("rejects unknown subcommands", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningExperimentCommand({
        args: ["bogus"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists nothing gracefully before any experiment exists", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningExperimentCommand({
        args: ["list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });
});
