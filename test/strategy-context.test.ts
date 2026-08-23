import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ContextPacketCompiler } from "../src/context/packet.js";
import { contextSelectionSchema } from "../src/context/schemas.js";
import { compileProjectContext } from "../src/commands/context.js";
import { runStartCommand } from "../src/commands/start.js";
import { initializeProject } from "../src/commands/init.js";
import { createDecisionStore } from "../src/decisions/store.js";
import { DecisionService } from "../src/decisions/service.js";
import { EvidenceService } from "../src/learning/evidence-service.js";
import { EvidenceStore } from "../src/learning/evidence-store.js";
import { ExperimentStore } from "../src/learning/experiment-store.js";
import { HypothesisStore } from "../src/learning/hypothesis-store.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { StrategyService } from "../src/strategy/strategy-service.js";
import { StrategyStore } from "../src/strategy/strategy-store.js";
import { WorkService } from "../src/work/service.js";

function baseSelection(overrides: Record<string, unknown> = {}) {
  return {
    work: {
      kind: "task",
      item: {
        id: "task.strategy",
        phaseId: "phase.strategy",
        name: "Strategy",
        description: "Strategy task.",
        status: "active",
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:00:00Z",
        scope: { include: ["src/strategy/**"], exclude: [] },
      },
      phase: {
        id: "phase.strategy",
        featureId: "feature.strategy",
        sequence: 1,
        name: "Strategy",
        description: "Strategy.",
        status: "active",
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:00:00Z",
      },
      feature: {
        id: "feature.strategy",
        name: "Strategy",
        description: "Strategy.",
        status: "active",
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:00:00Z",
      },
      startedAt: "2026-08-23T00:00:00Z",
      objective: "Use strategy",
      reasons: ["test"],
      estimatedTokens: 10,
    },
    doctrines: [],
    decisions: [],
    specs: [],
    exclusions: [],
    budget: {
      maxTokens: 100,
      usedTokens: 10,
      remainingTokens: 90,
      exceeded: false,
    },
    ...overrides,
  };
}

const ASSESSMENT = {
  id: "strategy.recruiter-messaging",
  workId: "feature.strategy",
  factors: {
    alignment: "low",
    value: "uncertain",
    risk: "high",
    cost: "medium",
    evidenceStrength: "low",
    dependencyPressure: "low",
    complexity: "medium",
    releaseConstraint: "low",
  },
  decision: "backlog",
  rationale: "High spam risk, low alignment, thin evidence.",
  evidenceIds: [],
  resultingDecision: "decision.strategic-assessment-recommends-backlog",
  supersedes: null,
  status: "active",
  createdAt: "2026-08-23T00:00:00Z",
  updatedAt: "2026-08-23T00:00:00Z",
};

describe("strategy context delivery", () => {
  it("renders the strategy assessment in the context packet when present", () => {
    const selection = contextSelectionSchema.parse(
      baseSelection({ strategy: ASSESSMENT }),
    );
    const content = new ContextPacketCompiler().compile(selection).content;

    expect(content).toContain("## Strategy Assessment");
    expect(content).toContain("strategy.recruiter-messaging");
    expect(content).toContain("backlog");
    expect(content).toContain("High spam risk, low alignment, thin evidence.");
  });

  it("omits the strategy section when no assessment is present", () => {
    const selection = contextSelectionSchema.parse(baseSelection());
    const content = new ContextPacketCompiler().compile(selection).content;

    expect(content).not.toContain("## Strategy Assessment");
  });
});

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("compileProjectContext strategy wiring", () => {
  it("includes the active work item's active strategy assessment", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-strategy-context-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });

    const workStore = createWorkStateStore(projectRoot);
    const workService = new WorkService(workStore);
    const issue = await workService.createIssue({
      name: "Recruiter Messaging",
      description: "Let recruiters message candidates directly.",
      scope: { include: ["src/messaging/**"], exclude: [] },
    });

    const evidenceService = new EvidenceService(
      new EvidenceStore(projectRoot),
      new ExperimentStore(projectRoot),
      new HypothesisStore(projectRoot),
      workStore,
    );
    const decisionService = new DecisionService(
      createDecisionStore(projectRoot),
      workStore,
      { evidenceService },
    );
    const strategyService = new StrategyService(
      new StrategyStore(projectRoot),
      decisionService,
      evidenceService,
      workStore,
    );
    await strategyService.assess({
      workId: issue.entity.id,
      factors: {
        alignment: "high",
        value: "high",
        risk: "low",
        cost: "medium",
        evidenceStrength: "high",
        dependencyPressure: "low",
        complexity: "medium",
        releaseConstraint: "low",
      },
      decision: "now",
      rationale: "Clear evidence, low risk.",
      evidenceIds: [],
    });

    const startOutput = { stdout: () => {}, stderr: () => {} };
    await runStartCommand({
      args: ["issue", issue.entity.id],
      output: startOutput,
      startDirectory: projectRoot,
    });

    const { packet } = await compileProjectContext(projectRoot);
    expect(packet.content).toContain("## Strategy Assessment");
    expect(packet.content).toContain("now");

    const firstAssessment = (await strategyService.history(issue.entity.id))[0];
    if (!firstAssessment) {
      throw new Error("Expected the first assessment to exist.");
    }

    await strategyService.assess({
      workId: issue.entity.id,
      factors: {
        alignment: "low",
        value: "low",
        risk: "high",
        cost: "high",
        evidenceStrength: "uncertain",
        dependencyPressure: "high",
        complexity: "high",
        releaseConstraint: "high",
      },
      decision: "backlog",
      rationale: "New evidence reverses the earlier call.",
      evidenceIds: [],
      supersedes: firstAssessment.id,
    });

    const { packet: updatedPacket } = await compileProjectContext(projectRoot);
    const strategySection = updatedPacket.content
      .split("## Strategy Assessment")[1]
      ?.split("## Relevant Decisions")[0];
    expect(strategySection).toBeDefined();
    expect(strategySection).toContain("backlog");
    expect(strategySection).toContain(
      "New evidence reverses the earlier call.",
    );
    expect(strategySection).not.toContain("Clear evidence, low risk.");
  });
});
