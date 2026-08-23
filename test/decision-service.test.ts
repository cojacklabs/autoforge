import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createDecisionStore,
  createInitialDecisionMemory,
} from "../src/decisions/store.js";
import { DecisionService } from "../src/decisions/service.js";
import {
  createInitialWorkState,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const TIMESTAMP = "2026-08-20T04:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-decision-service-"),
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
  const options = {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  };
  const decisionStore = createDecisionStore(projectRoot, options);
  const workStore = createWorkStateStore(projectRoot, options);
  await decisionStore.initialize(createInitialDecisionMemory());
  await workStore.initialize(createInitialWorkState());
  const feature = await new WorkService(workStore, options).createFeature({
    name: "Decision Memory",
    description: "Persist project rationale.",
  });
  return {
    decisionStore,
    feature,
    service: new DecisionService(decisionStore, workStore, options),
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    statement: "Use deterministic decision search.",
    reasoning: "The initial release must remain explainable and local.",
    consequences: ["Search uses explicit textual signals."],
    scope: ["decisions", "search"],
    keywords: ["deterministic", "relevance", "search"],
    relatedWork: ["feature.decision-memory"],
    ...overrides,
  };
}

describe("decision service", () => {
  it("records a persistent active decision", async () => {
    const { decisionStore, service } = await createFixture();

    await expect(service.record(input())).resolves.toMatchObject({
      decision: {
        id: "decision.use-deterministic-decision-search",
        status: "active",
        createdAt: TIMESTAMP,
        relatedWork: ["feature.decision-memory"],
      },
      revision: 1,
    });
    await expect(decisionStore.read()).resolves.toMatchObject({
      state: {
        revision: 1,
        data: {
          decisions: [{ id: "decision.use-deterministic-decision-search" }],
        },
      },
    });
  });

  it("allocates collision-safe readable IDs", async () => {
    const { service } = await createFixture();

    await expect(service.record(input())).resolves.toMatchObject({
      decision: { id: "decision.use-deterministic-decision-search" },
    });
    await expect(service.record(input())).resolves.toMatchObject({
      decision: { id: "decision.use-deterministic-decision-search-2" },
    });
  });

  it("supersedes an active decision atomically", async () => {
    const { decisionStore, service } = await createFixture();
    const original = await service.record(input());

    await expect(
      service.record(
        input({
          statement: "Use weighted deterministic decision search.",
          reasoning: "Weighted fields improve explainable relevance.",
          supersedes: original.decision.id,
        }),
      ),
    ).resolves.toMatchObject({
      decision: {
        id: "decision.use-weighted-deterministic-decision-search",
        supersedes: original.decision.id,
        status: "active",
      },
      revision: 2,
    });
    await expect(decisionStore.read()).resolves.toMatchObject({
      state: {
        revision: 2,
        data: {
          decisions: [
            { id: original.decision.id, status: "superseded" },
            {
              id: "decision.use-weighted-deterministic-decision-search",
              status: "active",
            },
          ],
        },
      },
    });
  });

  it("rejects unknown related work without changing memory", async () => {
    const { decisionStore, service } = await createFixture();

    await expect(
      service.record(input({ relatedWork: ["task.missing"] })),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
      details: { unknownWorkIds: ["task.missing"] },
    });
    await expect(decisionStore.read()).resolves.toMatchObject({
      state: { revision: 0, data: { decisions: [] } },
    });
  });

  it("records an explicit decision kind", async () => {
    const { service } = await createFixture();
    const result = await service.record(
      input({
        statement: "Fix null pointer on empty cart.",
        reasoning: "Cart total crashed when no items were present.",
        consequences: ["Guard the total calculation against an empty array."],
        scope: ["checkout"],
        keywords: ["bugfix", "cart"],
        kind: "bugfix",
      }),
    );
    expect(result.decision.kind).toBe("bugfix");
  });

  it("defaults decision kind to architecture when not provided", async () => {
    const { service } = await createFixture();
    const result = await service.record(
      input({
        statement: "Use Postgres for durable storage.",
        reasoning: "Matches existing operational tooling.",
        consequences: ["Provision a Postgres instance."],
        scope: ["storage"],
        keywords: ["database"],
      }),
    );
    expect(result.decision.kind).toBe("architecture");
  });

  it("stamps resultingDecision on referenced evidence", async () => {
    const { decisionStore } = await createFixture();
    const { EvidenceStore } = await import("../src/learning/evidence-store.js");
    const { EvidenceService } = await import(
      "../src/learning/evidence-service.js"
    );
    const { ExperimentStore } = await import(
      "../src/learning/experiment-store.js"
    );
    const { HypothesisStore } = await import(
      "../src/learning/hypothesis-store.js"
    );
    const evidenceStore = new EvidenceStore(projectRoot);
    await evidenceStore.ensure();
    const evidenceResult = await new EvidenceService(
      evidenceStore,
      new ExperimentStore(projectRoot),
      new HypothesisStore(projectRoot),
    ).record({
      kind: "bug-report",
      summary: "Example bug report.",
      source: "Example.",
      relatedWork: "feature.decision-memory",
    });

    const workStore = createWorkStateStore(projectRoot, {
      now: () => new Date(TIMESTAMP),
      temporaryId: () => "test",
    });
    const decisionServiceWithEvidence = new DecisionService(
      decisionStore,
      workStore,
      {
        now: () => new Date(TIMESTAMP),
        evidenceService: new EvidenceService(
          evidenceStore,
          new ExperimentStore(projectRoot),
          new HypothesisStore(projectRoot),
        ),
      },
    );

    const result = await decisionServiceWithEvidence.record(
      input({ evidence: [evidenceResult.evidence.id] }),
    );

    const { state } = await evidenceStore.state.read();
    expect(
      state.data.evidence.find((item) => item.id === evidenceResult.evidence.id)
        ?.resultingDecision,
    ).toBe(result.decision.id);
  });

  it("does not require evidenceService when no --evidence is provided", async () => {
    const { service } = await createFixture();
    await expect(service.record(input())).resolves.toMatchObject({
      decision: { status: "active" },
    });
  });

  it("rejects evidence references when no evidenceService is configured", async () => {
    const { service } = await createFixture();
    await expect(
      service.record(input({ evidence: ["evidence.anything"] })),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects unknown --evidence id without writing a decision", async () => {
    const { decisionStore } = await createFixture();
    const { EvidenceStore } = await import("../src/learning/evidence-store.js");
    const { EvidenceService } = await import(
      "../src/learning/evidence-service.js"
    );
    const { ExperimentStore } = await import(
      "../src/learning/experiment-store.js"
    );
    const { HypothesisStore } = await import(
      "../src/learning/hypothesis-store.js"
    );
    const evidenceStore = new EvidenceStore(projectRoot);
    await evidenceStore.ensure();

    const workStore = createWorkStateStore(projectRoot, {
      now: () => new Date(TIMESTAMP),
      temporaryId: () => "test",
    });
    const decisionServiceWithEvidence = new DecisionService(
      decisionStore,
      workStore,
      {
        now: () => new Date(TIMESTAMP),
        evidenceService: new EvidenceService(
          evidenceStore,
          new ExperimentStore(projectRoot),
          new HypothesisStore(projectRoot),
        ),
      },
    );

    await expect(
      decisionServiceWithEvidence.record(
        input({ evidence: ["evidence.does-not-exist"] }),
      ),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
      details: { unknownEvidenceIds: ["evidence.does-not-exist"] },
    });
    await expect(decisionStore.read()).resolves.toMatchObject({
      state: { revision: 0, data: { decisions: [] } },
    });
  });

  it("rejects missing or previously superseded targets", async () => {
    const { decisionStore, service } = await createFixture();
    await expect(
      service.record(input({ supersedes: "decision.missing" })),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    const original = await service.record(input());
    await service.record(
      input({
        statement: "Use weighted search.",
        supersedes: original.decision.id,
      }),
    );

    await expect(
      service.record(
        input({
          statement: "Replace it again.",
          supersedes: original.decision.id,
        }),
      ),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
    await expect(decisionStore.read()).resolves.toMatchObject({
      state: { revision: 2 },
    });
  });
});
