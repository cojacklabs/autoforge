import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createInitialSessionState,
  createInitialWorkState,
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkLifecycleService } from "../src/work/lifecycle.js";
import { WorkRecapService } from "../src/work/recap.js";
import { WorkService } from "../src/work/service.js";

const STARTED_AT = "2026-08-20T01:00:00.000Z";
const RECAP_AT = "2026-08-20T01:30:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-recap-"));
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
  const storeOptions = {
    now: () => new Date(STARTED_AT),
    temporaryId: () => "test",
  };
  const workStore = createWorkStateStore(projectRoot, storeOptions);
  const sessionStore = createSessionStateStore(projectRoot, storeOptions);
  await workStore.initialize(createInitialWorkState());
  await sessionStore.initialize(createInitialSessionState());
  const creator = new WorkService(workStore, storeOptions);
  const feature = await creator.createFeature({
    name: "Control Kernel",
    description: "Implement work control.",
  });
  const phase = await creator.createPhase({
    featureId: feature.entity.id,
    name: "Read Model",
    description: "Summarize current work.",
  });
  const task = await creator.createTask({
    phaseId: phase.entity.id,
    name: "Build Recap",
    description: "Create deterministic recap data.",
    scope: { include: ["src/work/recap.ts"], exclude: ["dist/**"] },
  });
  const issue = await creator.createIssue({
    name: "Check Counters",
    description: "Verify recap status counts.",
    scope: { include: ["test/work-recap.test.ts"], exclude: [] },
  });
  const lifecycle = new WorkLifecycleService(workStore, sessionStore, {
    now: storeOptions.now,
    sessionId: () => "session.recap",
  });
  const recap = new WorkRecapService(workStore, sessionStore, {
    now: () => new Date(RECAP_AT),
  });
  return { issue, lifecycle, recap, sessionStore, task, workStore };
}

describe("work recap service", () => {
  it("projects active task hierarchy, scope, counters, and elapsed time", async () => {
    const { lifecycle, recap, task } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });

    await expect(recap.read()).resolves.toEqual({
      status: "active",
      inventory: { features: 1, phases: 1, tasks: 1, issues: 1 },
      actionableByStatus: {
        planned: 1,
        ready: 0,
        active: 1,
        blocked: 0,
        completed: 0,
        canceled: 0,
      },
      recentSession: null,
      active: {
        kind: "task",
        id: "task.build-recap",
        name: "Build Recap",
        description: "Create deterministic recap data.",
        scope: { include: ["src/work/recap.ts"], exclude: ["dist/**"] },
        startedAt: STARTED_AT,
        phase: { id: "phase.read-model", name: "Read Model", sequence: 1 },
        feature: { id: "feature.control-kernel", name: "Control Kernel" },
      },
      session: {
        id: "session.recap",
        startedAt: STARTED_AT,
        elapsedSeconds: 1800,
      },
    });
  });

  it("projects a standalone active issue without hierarchy", async () => {
    const { issue, lifecycle, recap } = await createFixture();
    await lifecycle.start({ kind: "issue", id: issue.entity.id });

    await expect(recap.read()).resolves.toMatchObject({
      status: "active",
      active: {
        kind: "issue",
        id: "issue.check-counters",
        scope: { include: ["test/work-recap.test.ts"] },
      },
    });
  });

  it("returns idle state with the most recent completed session", async () => {
    const { lifecycle, recap, task } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await lifecycle.complete();

    await expect(recap.read()).resolves.toMatchObject({
      status: "idle",
      active: null,
      session: null,
      actionableByStatus: { planned: 1, active: 0, completed: 1 },
      recentSession: {
        id: "session.recap",
        status: "ended",
        activeWork: { kind: "task", id: task.entity.id },
      },
    });
  });

  it("rejects contradictory work and session envelopes", async () => {
    const { recap, sessionStore } = await createFixture();
    await sessionStore.write(
      {
        current: {
          id: "session.orphaned",
          status: "active",
          startedAt: STARTED_AT,
          endedAt: null,
          activeWork: null,
        },
        previous: [],
      },
      { expectedRevision: 0 },
    );

    await expect(recap.read()).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });
});
