import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runStrategyCommand } from "../src/commands/strategy.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-strategy-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const feature = await new WorkService(
    createWorkStateStore(projectRoot),
  ).createFeature({
    name: "Recruiter Messaging",
    description: "Let recruiters message candidates directly.",
  });
  return { feature, projectRoot };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

// `overrides` replaces a base factor/decision value by flag name; `extra` appends
// additional flags (e.g. --supersedes) after the base set. This split keeps the
// parser's "a flag may only be provided once" rule from ever being triggered by
// the test helper itself — overriding --decision does not also duplicate it.
function assessArgs(
  workId: string,
  extra: string[] = [],
  overrides: Record<string, string> = {},
): string[] {
  const flags: Record<string, string> = {
    "--alignment": "low",
    "--value": "uncertain",
    "--risk": "high",
    "--cost": "medium",
    "--evidence-strength": "low",
    "--dependency-pressure": "low",
    "--complexity": "medium",
    "--release-constraint": "low",
    "--decision": "backlog",
    "--rationale": "High spam risk, low alignment, thin evidence.",
    ...overrides,
  };
  return [
    "assess",
    workId,
    ...Object.entries(flags).flatMap(([flag, value]) => [flag, value]),
    ...extra,
  ];
}

describe("strategy command", () => {
  it("records an assessment and reports the linked decision", async () => {
    const { feature, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runStrategyCommand({
        args: assessArgs(feature.entity.id),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Recorded strategy assessment",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain("linked decision");
  });

  it("rejects an invalid factor value", async () => {
    const { feature, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runStrategyCommand({
        args: assessArgs(feature.entity.id, ["--alignment", "extreme"]),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it.each([
    ["--alignment"],
    ["--value"],
    ["--risk"],
    ["--cost"],
    ["--evidence-strength"],
    ["--dependency-pressure"],
    ["--complexity"],
    ["--release-constraint"],
    ["--decision"],
    ["--rationale"],
  ])("rejects a missing required flag %s", async (missingFlag) => {
    const { feature, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    const fullArgs = assessArgs(feature.entity.id);
    const flagIndex = fullArgs.indexOf(missingFlag);
    const args = [
      ...fullArgs.slice(0, flagIndex),
      ...fullArgs.slice(flagIndex + 2),
    ];

    await expect(
      runStrategyCommand({ args, output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists only active assessments, filterable by decision", async () => {
    const { feature, projectRoot } = await createFixture();
    const assessOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: assessArgs(feature.entity.id),
      output: assessOutput,
      startDirectory: projectRoot,
    });

    const listOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runStrategyCommand({
        args: ["list"],
        output: listOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(listOutput.stdout.mock.calls[0]?.[0]).toContain(feature.entity.id);

    const filteredOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: ["list", "--decision", "now"],
      output: filteredOutput,
      startDirectory: projectRoot,
    });
    expect(filteredOutput.stdout.mock.calls[0]?.[0]).toBe("");
  });

  it("shows one assessment by id", async () => {
    const { feature, projectRoot } = await createFixture();
    const assessOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: assessArgs(feature.entity.id),
      output: assessOutput,
      startDirectory: projectRoot,
    });
    const id = /strategy\.[a-z0-9.-]+/.exec(
      assessOutput.stdout.mock.calls[0]?.[0] ?? "",
    )?.[0];
    expect(id).toBeDefined();

    const showOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runStrategyCommand({
        args: ["show", id!],
        output: showOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(showOutput.stdout.mock.calls[0]?.[0]).toContain("backlog");
  });

  it("returns history newest first after a supersede", async () => {
    const { feature, projectRoot } = await createFixture();
    const firstOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: assessArgs(feature.entity.id),
      output: firstOutput,
      startDirectory: projectRoot,
    });
    const firstId = /strategy\.[a-z0-9.-]+/.exec(
      firstOutput.stdout.mock.calls[0]?.[0] ?? "",
    )?.[0]!;

    await runStrategyCommand({
      args: assessArgs(feature.entity.id, ["--supersedes", firstId], {
        "--decision": "now",
      }),
      output: { stdout: vi.fn(), stderr: vi.fn() },
      startDirectory: projectRoot,
    });

    const historyOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runStrategyCommand({
        args: ["history", feature.entity.id],
        output: historyOutput,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    const lines = (historyOutput.stdout.mock.calls[0]?.[0] ?? "").split("\n");
    expect(lines[0]).toContain("now");
    expect(lines[1]).toContain("backlog");
  });
});
