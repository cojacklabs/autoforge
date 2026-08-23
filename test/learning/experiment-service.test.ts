import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HypothesisService } from "../../src/learning/hypothesis-service.js";
import { HypothesisStore } from "../../src/learning/hypothesis-store.js";
import { ExperimentService } from "../../src/learning/experiment-service.js";
import { ExperimentStore } from "../../src/learning/experiment-store.js";
import {
  createInitialWorkState,
  createWorkStateStore,
} from "../../src/state/kernel.js";

const TIMESTAMP = "2026-08-22T05:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-experiment-service-"),
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
  return {
    hypothesis: hypothesisResult.hypothesis,
    service: new ExperimentService(experimentStore, hypothesisStore, {
      now: () => new Date(TIMESTAMP),
    }),
  };
}

describe("experiment service", () => {
  it("records an experiment testing an existing hypothesis", async () => {
    const { hypothesis, service } = await createFixture();
    const result = await service.record({
      hypothesisIds: [hypothesis.id],
      method: "A/B test",
    });
    expect(result.experiment.status).toBe("planned");
    expect(result.experiment.hypothesisIds).toEqual([hypothesis.id]);
  });

  it("rejects an unknown hypothesisId", async () => {
    const { service } = await createFixture();
    await expect(
      service.record({
        hypothesisIds: ["hypothesis.does-not-exist"],
        method: "A/B test",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("marks an experiment completed", async () => {
    const { hypothesis, service } = await createFixture();
    const created = await service.record({
      hypothesisIds: [hypothesis.id],
      method: "A/B test",
    });
    const completed = await service.complete(created.experiment.id);
    expect(completed.experiment.status).toBe("completed");
    expect(completed.experiment.endedAt).not.toBeNull();
  });
});
