import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HypothesisService } from "../../src/learning/hypothesis-service.js";
import { HypothesisStore } from "../../src/learning/hypothesis-store.js";
import { ExperimentService } from "../../src/learning/experiment-service.js";
import { ExperimentStore } from "../../src/learning/experiment-store.js";
import { EvidenceService } from "../../src/learning/evidence-service.js";
import { EvidenceStore } from "../../src/learning/evidence-store.js";
import {
  createInitialWorkState,
  createWorkStateStore,
} from "../../src/state/kernel.js";
import { WorkService } from "../../src/work/service.js";

const TIMESTAMP = "2026-08-22T06:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-evidence-service-"),
  );
  temporaryDirectories.push(projectRoot);
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture() {
  const workStore = createWorkStateStore(projectRoot, {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
  await workStore.initialize(createInitialWorkState());
  const feature = await new WorkService(workStore, {
    now: () => new Date(TIMESTAMP),
  }).createFeature({
    name: "Evidence Fixture Feature",
    description: "Fixture feature for evidence-service tests.",
  });
  const hypothesisStore = new HypothesisStore(projectRoot);
  await hypothesisStore.ensure();
  const hypothesisResult = await new HypothesisService(
    hypothesisStore,
    workStore,
    { now: () => new Date(TIMESTAMP) },
  ).record({
    statement: "Example hypothesis.",
    expectedOutcome: "Example outcome.",
    metric: "example",
    target: "example",
  });
  const experimentStore = new ExperimentStore(projectRoot);
  await experimentStore.ensure();
  const experimentResult = await new ExperimentService(
    experimentStore,
    hypothesisStore,
    { now: () => new Date(TIMESTAMP) },
  ).record({
    hypothesisIds: [hypothesisResult.hypothesis.id],
    method: "A/B test",
  });
  const evidenceStore = new EvidenceStore(projectRoot);
  await evidenceStore.ensure();
  return {
    hypothesis: hypothesisResult.hypothesis,
    experiment: experimentResult.experiment,
    feature,
    service: new EvidenceService(
      evidenceStore,
      experimentStore,
      hypothesisStore,
      workStore,
      { now: () => new Date(TIMESTAMP) },
    ),
    evidenceStore,
  };
}

describe("evidence service", () => {
  it("records evidence linked to an experiment", async () => {
    const { experiment, service } = await createFixture();
    const result = await service.record({
      kind: "beta-feedback",
      summary: "Beta users onboarded faster.",
      source: "Beta cohort #3",
      experimentId: experiment.id,
    });
    expect(result.evidence.experimentId).toBe(experiment.id);
    expect(result.evidence.resultingDecision).toBeNull();
  });

  it("records evidence linked directly to a hypothesis with no experiment", async () => {
    const { hypothesis, service } = await createFixture();
    const result = await service.record({
      kind: "support-ticket",
      summary: "User confused by onboarding step 3.",
      source: "Support ticket #4821",
      hypothesisId: hypothesis.id,
    });
    expect(result.evidence.hypothesisId).toBe(hypothesis.id);
    expect(result.evidence.experimentId).toBeNull();
  });

  it("rejects an unknown experimentId", async () => {
    const { service } = await createFixture();
    await expect(
      service.record({
        kind: "bug-report",
        summary: "Example.",
        source: "Example.",
        experimentId: "experiment.does-not-exist",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects an unknown relatedWork id", async () => {
    const { service } = await createFixture();
    await expect(
      service.record({
        kind: "bug-report",
        summary: "Example.",
        source: "Example.",
        relatedWork: "issue.does-not-exist",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("records evidence linked to a real work item", async () => {
    const { feature, service } = await createFixture();
    const result = await service.record({
      kind: "bug-report",
      summary: "Example.",
      source: "Example.",
      relatedWork: feature.entity.id,
    });
    expect(result.evidence.relatedWork).toBe(feature.entity.id);
  });

  it("stamps resultingDecision on referenced evidence", async () => {
    const { experiment, service, evidenceStore } = await createFixture();
    const recorded = await service.record({
      kind: "beta-feedback",
      summary: "Example.",
      source: "Example.",
      experimentId: experiment.id,
    });
    await service.stampResultingDecision(
      [recorded.evidence.id],
      "decision.example-decision",
    );
    const { state } = await evidenceStore.state.read();
    expect(
      state.data.evidence.find((item) => item.id === recorded.evidence.id)
        ?.resultingDecision,
    ).toBe("decision.example-decision");
  });
});
