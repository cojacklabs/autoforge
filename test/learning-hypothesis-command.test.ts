import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runLearningHypothesisCommand } from "../src/commands/learning-hypothesis.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-learning-hypothesis-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return { projectRoot };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("learning hypothesis command", () => {
  it("adds, lists, and shows a hypothesis", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
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
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const listOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: ["list"],
        output: listOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(listOutput.stdout.mock.calls[0]?.[0]).toContain(
      "hypothesis.a-shorter-onboarding-flow-increases-activation",
    );

    const showOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: [
          "show",
          "hypothesis.a-shorter-onboarding-flow-increases-activation",
        ],
        output: showOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(showOutput.stdout.mock.calls[0]?.[0] ?? "{}").status,
    ).toBe("proposed");
  });

  it("sets hypothesis status", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runLearningHypothesisCommand({
      args: [
        "add",
        "--statement",
        "Example.",
        "--expected-outcome",
        "Example.",
        "--metric",
        "example",
        "--target",
        "example",
      ],
      output,
      startDirectory: projectRoot,
    });
    await expect(
      runLearningHypothesisCommand({
        args: ["status", "hypothesis.example", "--status", "confirmed"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("rejects unknown subcommands", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: ["bogus"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists nothing gracefully before any hypothesis exists", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: ["list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });
});
