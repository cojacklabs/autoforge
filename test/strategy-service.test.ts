import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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

const TIMESTAMP = "2026-08-23T00:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-strategy-service-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });

  const workStore = createWorkStateStore(projectRoot);
  const feature = await new WorkService(workStore).createFeature({
    name: "Recruiter Messaging",
    description: "Let recruiters message candidates directly.",
  });

  const evidenceStore = new EvidenceStore(projectRoot);
  const evidenceService = new EvidenceService(
    evidenceStore,
    new ExperimentStore(projectRoot),
    new HypothesisStore(projectRoot),
    workStore,
    { now: () => new Date(TIMESTAMP) },
  );

  const decisionService = new DecisionService(
    createDecisionStore(projectRoot),
    workStore,
    { evidenceService, now: () => new Date(TIMESTAMP) },
  );

  const strategyStore = new StrategyStore(projectRoot);
  const service = new StrategyService(
    strategyStore,
    decisionService,
    evidenceService,
    workStore,
    { now: () => new Date(TIMESTAMP) },
  );

  return {
    projectRoot,
    feature,
    service,
    strategyStore,
    evidenceService,
    evidenceStore,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const FACTORS = {
  alignment: "low" as const,
  value: "uncertain" as const,
  risk: "high" as const,
  cost: "medium" as const,
  evidenceStrength: "low" as const,
  dependencyPressure: "low" as const,
  complexity: "medium" as const,
  releaseConstraint: "low" as const,
};

describe("StrategyService.assess", () => {
  it("rejects an unknown work item", async () => {
    const { service } = await createFixture();

    await expect(
      service.assess({
        workId: "feature.does-not-exist",
        factors: FACTORS,
        decision: "backlog",
        rationale: "No such feature.",
        evidenceIds: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects an unknown evidence id", async () => {
    const { service, feature } = await createFixture();

    await expect(
      service.assess({
        workId: feature.entity.id,
        factors: FACTORS,
        decision: "backlog",
        rationale: "Referencing evidence that does not exist.",
        evidenceIds: ["evidence.does-not-exist"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("persists an assessment and writes a linked decision", async () => {
    const { service, feature, strategyStore } = await createFixture();

    const result = await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "High spam risk, low alignment, thin evidence.",
      evidenceIds: [],
    });

    expect(result.assessment.status).toBe("active");
    expect(result.assessment.resultingDecision).not.toBeNull();

    const { state } = await strategyStore.state.read();
    expect(state.data.assessments).toHaveLength(1);
    expect(state.data.assessments[0]?.id).toBe(result.assessment.id);
  });

  it("stamps resultingDecision onto referenced evidence via the linked decision", async () => {
    const { service, feature, evidenceService, evidenceStore } =
      await createFixture();

    const evidence = await evidenceService.record({
      kind: "beta-feedback",
      summary: "Beta cohort reported concern about unsolicited messages.",
      source: "Beta survey.",
      relatedWork: feature.entity.id,
    });

    await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "Evidence indicates spam risk.",
      evidenceIds: [evidence.evidence.id],
    });

    const { state } = await evidenceStore.state.read();
    const stamped = state.data.evidence.find(
      (item) => item.id === evidence.evidence.id,
    );
    expect(stamped?.resultingDecision).not.toBeNull();
  });

  it("supersedes a prior assessment for the same work item", async () => {
    const { service, feature } = await createFixture();

    const first = await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "Initial read: too risky.",
      evidenceIds: [],
    });

    const second = await service.assess({
      workId: feature.entity.id,
      factors: { ...FACTORS, risk: "low", alignment: "high" },
      decision: "now",
      rationale: "Spam controls shipped; risk is now low.",
      evidenceIds: [],
      supersedes: first.assessment.id,
    });

    const history = await service.history(feature.entity.id);
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe(second.assessment.id);
    expect(history[0]?.status).toBe("active");
    expect(history[1]?.id).toBe(first.assessment.id);
    expect(history[1]?.status).toBe("superseded");
  });

  it("rejects superseding an already-superseded assessment", async () => {
    const { service, feature } = await createFixture();

    const first = await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "backlog",
      rationale: "Initial read.",
      evidenceIds: [],
    });
    await service.assess({
      workId: feature.entity.id,
      factors: FACTORS,
      decision: "next",
      rationale: "Re-assessed.",
      evidenceIds: [],
      supersedes: first.assessment.id,
    });

    await expect(
      service.assess({
        workId: feature.entity.id,
        factors: FACTORS,
        decision: "now",
        rationale: "Third pass.",
        evidenceIds: [],
        supersedes: first.assessment.id,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });

  it("rejects superseding an unknown assessment id", async () => {
    const { service, feature } = await createFixture();

    await expect(
      service.assess({
        workId: feature.entity.id,
        factors: FACTORS,
        decision: "now",
        rationale: "Referencing a nonexistent assessment.",
        evidenceIds: [],
        supersedes: "strategy.does-not-exist",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});
