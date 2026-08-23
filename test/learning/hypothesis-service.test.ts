import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HypothesisStore } from "../../src/learning/hypothesis-store.js";
import { HypothesisService } from "../../src/learning/hypothesis-service.js";
import {
  createInitialWorkState,
  createWorkStateStore,
} from "../../src/state/kernel.js";
import { WorkService } from "../../src/work/service.js";

const TIMESTAMP = "2026-08-22T04:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-hypothesis-service-"),
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
    name: "Onboarding redesign",
    description: "Shorten the first-run flow.",
  });
  const hypothesisStore = new HypothesisStore(projectRoot);
  await hypothesisStore.ensure();
  return {
    feature,
    service: new HypothesisService(hypothesisStore, workStore, {
      now: () => new Date(TIMESTAMP),
    }),
  };
}

describe("hypothesis service", () => {
  it("records a hypothesis with a generated id", async () => {
    const { feature, service } = await createFixture();
    const result = await service.record({
      statement: "A shorter onboarding flow increases activation.",
      expectedOutcome: "New users reach first value faster.",
      metric: "activation rate",
      target: ">= 40% within 7 days",
      linkedFeature: feature.entity.id,
    });
    expect(result.hypothesis.id).toBe(
      "hypothesis.a-shorter-onboarding-flow-increases-activation",
    );
    expect(result.hypothesis.status).toBe("proposed");
  });

  it("rejects a linkedFeature that does not exist", async () => {
    const { service } = await createFixture();
    await expect(
      service.record({
        statement: "Example.",
        expectedOutcome: "Example.",
        metric: "example",
        target: "example",
        linkedFeature: "feature.does-not-exist",
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("transitions status via setStatus", async () => {
    const { service } = await createFixture();
    const created = await service.record({
      statement: "Example hypothesis.",
      expectedOutcome: "Example outcome.",
      metric: "example",
      target: "example",
    });
    const updated = await service.setStatus(created.hypothesis.id, "confirmed");
    expect(updated.hypothesis.status).toBe("confirmed");
  });

  it("rejects setStatus for an unknown id", async () => {
    const { service } = await createFixture();
    await expect(
      service.setStatus("hypothesis.does-not-exist", "confirmed"),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});
