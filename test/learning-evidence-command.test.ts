import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runLearningEvidenceCommand } from "../src/commands/learning-evidence.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-learning-evidence-"),
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

describe("learning evidence command", () => {
  it("adds, lists, and shows evidence linked to related work", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningEvidenceCommand({
        args: [
          "add",
          "--kind",
          "beta-feedback",
          "--summary",
          "Beta users onboarded faster.",
          "--source",
          "Beta cohort #3",
          "--work",
          "issue.onboarding-drop-off",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const listOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningEvidenceCommand({
        args: ["list"],
        output: listOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(listOutput.stdout.mock.calls[0]?.[0]).toContain(
      "evidence.beta-users-onboarded-faster",
    );

    const filteredOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningEvidenceCommand({
        args: ["list", "--kind", "beta-feedback"],
        output: filteredOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(filteredOutput.stdout.mock.calls[0]?.[0]).toContain(
      "evidence.beta-users-onboarded-faster",
    );

    const showOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningEvidenceCommand({
        args: ["show", "evidence.beta-users-onboarded-faster"],
        output: showOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(showOutput.stdout.mock.calls[0]?.[0] ?? "{}").relatedWork,
    ).toBe("issue.onboarding-drop-off");
  });

  it("rejects unknown subcommands", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningEvidenceCommand({
        args: ["bogus"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("rejects add with no experiment, hypothesis, or work", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningEvidenceCommand({
        args: [
          "add",
          "--kind",
          "beta-feedback",
          "--summary",
          "Example.",
          "--source",
          "Example.",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists nothing gracefully before any evidence exists", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningEvidenceCommand({
        args: ["list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });
});
