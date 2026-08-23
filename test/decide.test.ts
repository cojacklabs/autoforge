import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDecideCommand } from "../src/commands/decide.js";
import { initializeProject } from "../src/commands/init.js";
import { createDecisionStore } from "../src/decisions/store.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-decide-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const feature = await new WorkService(
    createWorkStateStore(projectRoot),
  ).createFeature({
    name: "Decision Memory",
    description: "Persist project decisions.",
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

function decisionArgs(extra: string[] = []): string[] {
  return [
    "--statement",
    "Use deterministic search",
    "--reasoning",
    "Results must remain explainable",
    "--consequence",
    "Search uses fixed weights",
    "--scope",
    "decisions",
    "--keyword",
    "deterministic",
    ...extra,
  ];
}

describe("decide command", () => {
  it("records a decision linked to work from a nested directory", async () => {
    const { feature, projectRoot } = await createFixture();
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDecideCommand({
        args: decisionArgs(["--work", feature.entity.id]),
        output,
        startDirectory: nested,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      "Recorded decision decision.use-deterministic-search (revision 1).",
    );
    await expect(
      createDecisionStore(projectRoot).read(),
    ).resolves.toMatchObject({
      state: {
        revision: 1,
        data: {
          decisions: [
            {
              id: "decision.use-deterministic-search",
              relatedWork: [feature.entity.id],
            },
          ],
        },
      },
    });
  });

  it("records an atomic superseding decision", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runDecideCommand({
      args: decisionArgs(),
      output,
      startDirectory: projectRoot,
    });

    await expect(
      runDecideCommand({
        args: decisionArgs([
          "--statement",
          "Use weighted deterministic search",
          "--supersedes",
          "decision.use-deterministic-search",
        ]),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);

    const replacementArgs = decisionArgs().map((value) =>
      value === "Use deterministic search"
        ? "Use weighted deterministic search"
        : value,
    );
    await expect(
      runDecideCommand({
        args: [
          ...replacementArgs,
          "--supersedes",
          "decision.use-deterministic-search",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      createDecisionStore(projectRoot).read(),
    ).resolves.toMatchObject({
      state: {
        revision: 2,
        data: {
          decisions: [
            { id: "decision.use-deterministic-search", status: "superseded" },
            {
              id: "decision.use-weighted-deterministic-search",
              supersedes: "decision.use-deterministic-search",
            },
          ],
        },
      },
    });
  });

  it.each([
    { args: [], message: "--statement and --reasoning" },
    {
      args: ["--statement", "Missing metadata", "--reasoning", "Incomplete"],
      message: "At least one --consequence",
    },
  ])("rejects invalid arguments", async ({ args, message }) => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDecideCommand({ args, output, startDirectory: process.cwd() }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr.mock.calls[0]?.[0]).toContain(message);
  });

  it("accepts an explicit --kind flag", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runDecideCommand({
        args: decisionArgs(["--kind", "bugfix"]),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("rejects --kind provided more than once", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runDecideCommand({
        args: decisionArgs(["--kind", "bugfix", "--kind", "architecture"]),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("stamps resultingDecision when --evidence is provided", async () => {
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
        "Example bug report.",
        "--source",
        "Example.",
        "--work",
        feature.entity.id,
      ],
      output: evidenceOutput,
      startDirectory: projectRoot,
    });

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runDecideCommand({
        args: [...decisionArgs(), "--evidence", "evidence.example-bug-report"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const { EvidenceStore } = await import("../src/learning/evidence-store.js");
    const evidenceStore = new EvidenceStore(projectRoot);
    const { state } = await evidenceStore.state.read();
    expect(
      state.data.evidence.find(
        (item) => item.id === "evidence.example-bug-report",
      )?.resultingDecision,
    ).toBe("decision.use-deterministic-search");
  });

  it("rejects an unknown --evidence id", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runDecideCommand({
        args: [...decisionArgs(), "--evidence", "evidence.does-not-exist"],
        output,
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("returns usage for non-canonical metadata", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDecideCommand({
        args: decisionArgs().map((value) =>
          value === "deterministic" ? "Not Canonical" : value,
        ),
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    await expect(
      createDecisionStore(projectRoot).read(),
    ).resolves.toMatchObject({ state: { revision: 0 } });
  });
});
