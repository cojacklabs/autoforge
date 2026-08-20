import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createInitialWorkState,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const TIMESTAMP = "2026-08-20T00:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-work-service-"),
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

async function createService() {
  const store = createWorkStateStore(projectRoot, {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
  await store.initialize(createInitialWorkState());
  return {
    store,
    service: new WorkService(store, { now: () => new Date(TIMESTAMP) }),
  };
}

describe("work creation service", () => {
  it("creates and persists a complete work hierarchy", async () => {
    const { service, store } = await createService();

    const feature = await service.createFeature({
      name: "Control Kernel",
      description: "Implement durable work control.",
    });
    const phase = await service.createPhase({
      featureId: feature.entity.id,
      name: "Creation Services",
      description: "Create hierarchy records.",
    });
    const task = await service.createTask({
      phaseId: phase.entity.id,
      name: "Add Work Service",
      description: "Persist new work records.",
      scope: { include: ["src/work/**"], exclude: ["dist/**"] },
    });
    const issue = await service.createIssue({
      name: "Review IDs",
      description: "Verify generated identifiers.",
      scope: { include: ["test/work-service.test.ts"], exclude: [] },
    });

    expect([
      feature.revision,
      phase.revision,
      task.revision,
      issue.revision,
    ]).toEqual([1, 2, 3, 4]);
    await expect(store.read()).resolves.toMatchObject({
      state: {
        revision: 4,
        data: {
          features: [{ id: "feature.control-kernel", status: "planned" }],
          phases: [
            {
              id: "phase.creation-services",
              featureId: "feature.control-kernel",
              sequence: 1,
            },
          ],
          tasks: [
            {
              id: "task.add-work-service",
              phaseId: "phase.creation-services",
            },
          ],
          issues: [{ id: "issue.review-ids" }],
        },
      },
    });
  });

  it("allocates collision-safe readable IDs", async () => {
    const { service } = await createService();

    await expect(
      service.createFeature({ name: "API", description: "First API." }),
    ).resolves.toMatchObject({ entity: { id: "feature.api" } });
    await expect(
      service.createFeature({ name: "API", description: "Second API." }),
    ).resolves.toMatchObject({ entity: { id: "feature.api-2" } });
    await expect(
      service.createFeature({ name: "API", description: "Third API." }),
    ).resolves.toMatchObject({ entity: { id: "feature.api-3" } });
  });

  it("sequences phases within each feature", async () => {
    const { service } = await createService();
    const firstFeature = await service.createFeature({
      name: "First",
      description: "First feature.",
    });
    const secondFeature = await service.createFeature({
      name: "Second",
      description: "Second feature.",
    });

    await expect(
      service.createPhase({
        featureId: firstFeature.entity.id,
        name: "Discovery",
        description: "First phase.",
      }),
    ).resolves.toMatchObject({ entity: { sequence: 1 } });
    await expect(
      service.createPhase({
        featureId: firstFeature.entity.id,
        name: "Delivery",
        description: "Second phase.",
      }),
    ).resolves.toMatchObject({ entity: { sequence: 2 } });
    await expect(
      service.createPhase({
        featureId: secondFeature.entity.id,
        name: "Discovery",
        description: "Independent phase.",
      }),
    ).resolves.toMatchObject({ entity: { sequence: 1 } });
  });

  it("rejects missing parents without changing state", async () => {
    const { service, store } = await createService();

    await expect(
      service.createPhase({
        featureId: "feature.missing",
        name: "Orphan",
        description: "Should not persist.",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
      details: { kind: "feature", id: "feature.missing" },
    });
    await expect(
      service.createTask({
        phaseId: "phase.missing",
        name: "Orphan",
        description: "Should not persist.",
        scope: { include: ["src/**"], exclude: [] },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
      details: { kind: "phase", id: "phase.missing" },
    });
    await expect(store.read()).resolves.toMatchObject({
      state: { revision: 0 },
    });
  });

  it("rejects invalid entity input without changing state", async () => {
    const { service, store } = await createService();

    await expect(
      service.createIssue({
        name: "",
        description: "Invalid empty name.",
        scope: { include: ["/outside"], exclude: [] },
      }),
    ).rejects.toBeDefined();
    await expect(store.read()).resolves.toMatchObject({
      state: { revision: 0 },
    });
  });
});
