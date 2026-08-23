import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runWhyCommand } from "../src/commands/why.js";
import { initializeProject } from "../src/commands/init.js";
import { DecisionService } from "../src/decisions/service.js";
import { createDecisionStore } from "../src/decisions/store.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const TIMESTAMP = "2026-08-20T06:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-why-"));
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const workStore = createWorkStateStore(projectRoot);
  const feature = await new WorkService(workStore).createFeature({
    name: "Decision Memory",
    description: "Persist project rationale.",
  });
  const decisions = new DecisionService(
    createDecisionStore(projectRoot),
    workStore,
    { now: () => new Date(TIMESTAMP) },
  );
  const original = await decisions.record({
    statement: "Use fuzzy search.",
    reasoning: "The prototype favored broad matching.",
    consequences: ["Results are difficult to explain."],
    scope: ["decisions", "search"],
    keywords: ["fuzzy", "legacy"],
    relatedWork: [feature.entity.id],
  });
  await decisions.record({
    statement: "Use deterministic relevance search.",
    reasoning: "Fixed weights make decision retrieval explainable.",
    consequences: ["Search remains local and reproducible."],
    scope: ["decisions", "search"],
    keywords: ["deterministic", "relevance"],
    relatedWork: [feature.entity.id],
    supersedes: original.decision.id,
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

describe("why command", () => {
  it("renders deterministic rationale and match reasons", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runWhyCommand({
        args: ["--query", "determinism relevance"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain("Decision matches: 1");
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "decision.use-deterministic-relevance-search",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Reasoning: Fixed weights make decision retrieval explainable.",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain("keywords: relevance");
  });

  it("supports work-only search and result limits", async () => {
    const { feature, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runWhyCommand({
        args: ["--work", feature.entity.id, "--limit", "1"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain("Decision matches: 1");
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      `Related work: ${feature.entity.id}`,
    );
  });

  it("includes superseded decisions only with history", async () => {
    const { projectRoot } = await createFixture();
    const withoutHistory = { stdout: vi.fn(), stderr: vi.fn() };
    const withHistory = { stdout: vi.fn(), stderr: vi.fn() };

    await runWhyCommand({
      args: ["--query", "fuzzy legacy"],
      output: withoutHistory,
      startDirectory: projectRoot,
    });
    await runWhyCommand({
      args: ["--query", "fuzzy legacy", "--history"],
      output: withHistory,
      startDirectory: projectRoot,
    });

    expect(withoutHistory.stdout).toHaveBeenCalledWith(
      "No matching decisions.",
    );
    expect(withHistory.stdout.mock.calls[0]?.[0]).toContain(
      "decision.use-fuzzy-search",
    );
    expect(withHistory.stdout.mock.calls[0]?.[0]).toContain("superseded");
    expect(withHistory.stdout.mock.calls[0]?.[0]).toContain(
      "Superseded by: decision.use-deterministic-relevance-search",
    );
  });

  it("surfaces linked evidence beneath a matched decision", async () => {
    const { feature, projectRoot } = await createFixture();
    const { runLearningEvidenceCommand } = await import(
      "../src/commands/learning-evidence.js"
    );
    const evidenceOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runLearningEvidenceCommand({
      args: [
        "add",
        "--kind",
        "bug-report",
        "--summary",
        "Fuzzy matches returned unrelated decisions.",
        "--source",
        "Beta feedback thread.",
        "--work",
        feature.entity.id,
      ],
      output: evidenceOutput,
      startDirectory: projectRoot,
    });

    const { runDecideCommand } = await import("../src/commands/decide.js");
    const decideOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runDecideCommand({
      args: [
        "--statement",
        "Use deterministic relevance search.",
        "--reasoning",
        "Fixed weights make decision retrieval explainable.",
        "--consequence",
        "Search remains local and reproducible.",
        "--scope",
        "decisions",
        "--keyword",
        "deterministic",
        "--evidence",
        "evidence.fuzzy-matches-returned-unrelated-decisions",
      ],
      output: decideOutput,
      startDirectory: projectRoot,
    });

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runWhyCommand({
        args: ["--query", "deterministic relevance search"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Evidence: evidence.fuzzy-matches-returned-unrelated-decisions",
    );
  });

  it("omits the evidence line when no evidence references the decision", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runWhyCommand({
        args: ["--query", "determinism relevance"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).not.toContain("Evidence:");
  });

  it("surfaces validation evidence beneath a matched decision via related work", async () => {
    const { feature, projectRoot } = await createFixture();
    const decisions = new DecisionService(
      createDecisionStore(projectRoot),
      createWorkStateStore(projectRoot),
      { now: () => new Date(TIMESTAMP) },
    );
    await decisions.record({
      statement: "Ship the checkout redesign.",
      reasoning: "Improves conversion.",
      consequences: ["New checkout flow ships."],
      scope: ["checkout"],
      keywords: ["checkout", "redesign"],
      relatedWork: [feature.entity.id],
    });

    const { ValidationEvidenceStore } = await import(
      "../src/quality/evidence.js"
    );
    await new ValidationEvidenceStore(projectRoot).record({
      id: "evidence.command.tests.1",
      gateId: "command.tests",
      status: "passed",
      severity: "required",
      workId: feature.entity.id,
      traceIds: [],
      reason: "Quality command tests exited with code 0.",
      capturedAt: TIMESTAMP,
    });

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runWhyCommand({
        args: ["--query", "checkout redesign"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Validation: command.tests (passed)",
    );
  });

  it("omits the validation line when no validation evidence references the decision's related work", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runWhyCommand({
        args: ["--query", "determinism relevance"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).not.toContain("Validation:");
  });

  it.each([
    { args: [], message: "Provide --query" },
    {
      args: ["--limit", "0", "--query", "search"],
      message: "positive integer",
    },
    { args: ["--unknown", "value"], message: "Unknown why option" },
  ])("rejects invalid arguments", async ({ args, message }) => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runWhyCommand({ args, output, startDirectory: process.cwd() }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr.mock.calls[0]?.[0]).toContain(message);
  });
});
