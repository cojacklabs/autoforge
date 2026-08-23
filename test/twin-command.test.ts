import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { runLearningHypothesisCommand } from "../src/commands/learning-hypothesis.js";
import { runStrategyCommand } from "../src/commands/strategy.js";
import { runTwinCommand } from "../src/commands/twin.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const roots: string[] = [];

afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("twin command", () => {
  it("generates, shows, and queries a project projection", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-twin-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runTwinCommand({
        args: ["generate", "--json"],
        output,
        startDirectory: root,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      }),
    ).resolves.toBe(0);
    await expect(
      runTwinCommand({ args: ["show"], output, startDirectory: root }),
    ).resolves.toBe(0);
    await expect(
      runTwinCommand({
        args: ["query", "--type", "feature", "--json"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(0);
    expect(output.stderr).not.toHaveBeenCalled();
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"schemaVersion": 1'),
    );
  });

  it("includes hypothesis nodes in the generated projection", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-twin-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const learningOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: [
          "add",
          "--statement",
          "A shorter onboarding flow increases activation.",
          "--expected-outcome",
          "Activation rate increases.",
          "--metric",
          "activation-rate",
          "--target",
          "10%",
        ],
        output: learningOutput,
        startDirectory: root,
      }),
    ).resolves.toBe(0);

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTwinCommand({
        args: ["generate", "--json"],
        output,
        startDirectory: root,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      }),
    ).resolves.toBe(0);

    const call = output.stdout.mock.calls.find(([value]) =>
      typeof value === "string" ? value.includes('"schemaVersion"') : false,
    );
    expect(call).toBeDefined();
    const projection = JSON.parse(call![0] as string);
    expect(
      projection.nodes.some(
        (node: { type: string }) => node.type === "hypothesis",
      ),
    ).toBe(true);
  });

  it("includes governance, domain, strategy, and validation-evidence nodes in the generated projection", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-twin-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });

    const workStore = createWorkStateStore(root);
    const feature = await new WorkService(workStore).createFeature({
      name: "Messaging",
      description: "Messaging feature.",
    });

    const strategyOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runStrategyCommand({
      args: [
        "assess",
        feature.entity.id,
        "--alignment",
        "high",
        "--value",
        "high",
        "--risk",
        "low",
        "--cost",
        "medium",
        "--evidence-strength",
        "high",
        "--dependency-pressure",
        "low",
        "--complexity",
        "medium",
        "--release-constraint",
        "low",
        "--decision",
        "now",
        "--rationale",
        "Clear evidence, low risk.",
      ],
      output: strategyOutput,
      startDirectory: root,
    });

    await mkdir(path.join(root, ".autoforge", "governance"), {
      recursive: true,
    });
    await writeFile(
      path.join(root, ".autoforge", "governance", "constitution.json"),
      JSON.stringify({
        id: "constitution.default",
        name: "Default Constitution",
        purpose: "Govern this project.",
        rules: [
          {
            id: "constitution.example-rule",
            title: "Example rule",
            statement: "An example rule statement.",
            level: "SHOULD",
            enforcement: "advisory",
            scope: {
              paths: [],
              workKinds: ["feature"],
              releases: [],
              tags: [],
            },
            rationale: "Example rationale.",
            nonGoals: [],
          },
        ],
        source: ".autoforge/governance/constitution.json",
        updatedAt: "2026-08-22T12:00:00.000Z",
      }),
      "utf8",
    );

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTwinCommand({
        args: ["generate", "--json"],
        output,
        startDirectory: root,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      }),
    ).resolves.toBe(0);

    const call = output.stdout.mock.calls.find(([value]) =>
      typeof value === "string" ? value.includes('"schemaVersion"') : false,
    );
    expect(call).toBeDefined();
    const projection = JSON.parse(call![0] as string);
    expect(
      projection.nodes.some(
        (node: { type: string }) => node.type === "constitution",
      ),
    ).toBe(true);
    expect(
      projection.nodes.some(
        (node: { type: string }) => node.type === "strategy",
      ),
    ).toBe(true);
  });
});
