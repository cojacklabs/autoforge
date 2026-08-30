import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
import { WorkService } from "../src/work/service.js";

const TIMESTAMP = "2026-08-20T01:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-work-lifecycle-"),
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
  const workStore = createWorkStateStore(projectRoot, options);
  const sessionStore = createSessionStateStore(projectRoot, options);
  await workStore.initialize(createInitialWorkState());
  await sessionStore.initialize(createInitialSessionState());
  const workService = new WorkService(workStore, options);
  const feature = await workService.createFeature({
    name: "Control Kernel",
    description: "Implement work lifecycle behavior.",
  });
  const phase = await workService.createPhase({
    featureId: feature.entity.id,
    name: "Lifecycle",
    description: "Coordinate work and sessions.",
  });
  const task = await workService.createTask({
    phaseId: phase.entity.id,
    name: "Start Work",
    description: "Activate a task.",
    scope: { include: ["src/work/**"], exclude: [] },
  });
  const issue = await workService.createIssue({
    name: "Fix Session",
    description: "Activate an issue.",
    scope: { include: ["src/state/**"], exclude: [] },
  });
  const lifecycle = new WorkLifecycleService(workStore, sessionStore, {
    now: options.now,
    sessionId: () => "session.test",
  });
  return { issue, lifecycle, sessionStore, task, workStore };
}

describe("work start lifecycle", () => {
  it("activates a task and opens a matching session", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();

    await expect(
      lifecycle.start({ kind: "task", id: task.entity.id }),
    ).resolves.toMatchObject({
      activeWork: { kind: "task", id: task.entity.id, startedAt: TIMESTAMP },
      sessionId: "session.test",
      workRevision: 5,
      sessionRevision: 1,
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          tasks: [{ id: task.entity.id, status: "active" }],
          activeWork: { kind: "task", id: task.entity.id },
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: {
            id: "session.test",
            activeWork: { kind: "task", id: task.entity.id },
          },
        },
      },
    });
  });

  it("starts a standalone issue", async () => {
    const { issue, lifecycle } = await createFixture();

    await expect(
      lifecycle.start({ kind: "issue", id: issue.entity.id }),
    ).resolves.toMatchObject({
      activeWork: { kind: "issue", id: issue.entity.id },
    });
  });

  it("rejects a second start while work is active", async () => {
    const { issue, lifecycle, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });

    await expect(
      lifecycle.start({ kind: "issue", id: issue.entity.id }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        revision: 5,
        data: { activeWork: { id: task.entity.id } },
      },
    });
  });

  it("rejects missing and terminal work without opening a session", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();

    await expect(
      lifecycle.start({ kind: "task", id: "task.missing" }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    const current = await workStore.read();
    await workStore.write(
      {
        ...current.state.data,
        tasks: current.state.data.tasks.map((candidate) =>
          candidate.id === task.entity.id
            ? { ...candidate, status: "completed" }
            : candidate,
        ),
      },
      { expectedRevision: current.state.revision },
    );
    await expect(
      lifecycle.start({ kind: "task", id: task.entity.id }),
    ).rejects.toMatchObject({
      code: "STATE_CONFLICT",
      details: { status: "completed" },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: { revision: 0, data: { current: null } },
    });
  });

  it("restores work when the session write fails", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await writeFile(sessionStore.lockPath, "competing-session\n");

    await expect(
      lifecycle.start({ kind: "task", id: task.entity.id }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        revision: 6,
        data: {
          tasks: [{ id: task.entity.id, status: "planned" }],
          activeWork: null,
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: { revision: 0, data: { current: null } },
    });
  });
});

describe("work completion lifecycle", () => {
  it("completes active work and archives the current session", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });

    await expect(lifecycle.complete()).resolves.toMatchObject({
      completedWork: { kind: "task", id: task.entity.id },
      sessionId: "session.test",
      completedAt: TIMESTAMP,
      workRevision: 6,
      sessionRevision: 2,
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          tasks: [{ id: task.entity.id, status: "completed" }],
          activeWork: null,
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: null,
          previous: [
            {
              id: "session.test",
              status: "ended",
              endedAt: TIMESTAMP,
              activeWork: { kind: "task", id: task.entity.id },
            },
          ],
        },
      },
    });
  });

  it("completes an active issue", async () => {
    const { issue, lifecycle, workStore } = await createFixture();
    await lifecycle.start({ kind: "issue", id: issue.entity.id });

    await expect(lifecycle.complete()).resolves.toMatchObject({
      completedWork: { kind: "issue", id: issue.entity.id },
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: { issues: [{ id: issue.entity.id, status: "completed" }] },
      },
    });
  });

  it("rejects completion when nothing is active", async () => {
    const { lifecycle, sessionStore, workStore } = await createFixture();

    await expect(lifecycle.complete()).rejects.toMatchObject({
      code: "STATE_CONFLICT",
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: { revision: 4 },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: { revision: 0 },
    });
  });

  it("rejects contradictory work and session state", async () => {
    const { lifecycle, sessionStore } = await createFixture();
    await sessionStore.write(
      {
        current: {
          id: "session.orphaned",
          status: "active",
          startedAt: TIMESTAMP,
          endedAt: null,
          activeWork: null,
        },
        previous: [],
      },
      { expectedRevision: 0 },
    );

    await expect(lifecycle.complete()).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("restores active work when session archival fails", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await writeFile(sessionStore.lockPath, "competing-session\n");

    await expect(lifecycle.complete()).rejects.toMatchObject({
      code: "STATE_CONFLICT",
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        revision: 7,
        data: {
          tasks: [{ id: task.entity.id, status: "active" }],
          activeWork: { kind: "task", id: task.entity.id },
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        revision: 1,
        data: { current: { id: "session.test", status: "active" } },
      },
    });
  });
});

describe("work pause lifecycle", () => {
  it("pauses active work, records the reason, and ends the session", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });

    await expect(
      lifecycle.pause("Waiting on account access."),
    ).resolves.toMatchObject({
      pausedWork: { kind: "task", id: task.entity.id },
      sessionId: "session.test",
      pausedAt: TIMESTAMP,
      workRevision: 6,
      sessionRevision: 2,
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          tasks: [
            {
              id: task.entity.id,
              status: "paused",
              pauseReason: "Waiting on account access.",
            },
          ],
          activeWork: null,
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: null,
          previous: [
            {
              id: "session.test",
              status: "ended",
              endedAt: TIMESTAMP,
              activeWork: { kind: "task", id: task.entity.id },
            },
          ],
        },
      },
    });
  });

  it("rejects pausing when nothing is active", async () => {
    const { lifecycle, workStore } = await createFixture();

    await expect(lifecycle.pause("No active work.")).rejects.toMatchObject({
      code: "STATE_CONFLICT",
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: { revision: 4 },
    });
  });

  it("restores active work when session archival fails during pause", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await writeFile(sessionStore.lockPath, "competing-session\n");

    await expect(lifecycle.pause("Blocked.")).rejects.toMatchObject({
      code: "STATE_CONFLICT",
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        revision: 7,
        data: {
          tasks: [{ id: task.entity.id, status: "active" }],
          activeWork: { kind: "task", id: task.entity.id },
        },
      },
    });
  });
});

describe("work resume lifecycle", () => {
  it("resumes a paused task and opens a new session", async () => {
    const { lifecycle, sessionStore, task, workStore } = await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await lifecycle.pause("Waiting on account access.");

    // Real usage generates a fresh session ID per start/resume call (see
    // src/commands/resume.ts's randomUUID()-based default). The fixture's
    // `lifecycle` was constructed with a session ID fixed at "session.test",
    // which is now archived in `previous` from the pause above — reusing it
    // for resume would collide with sessionStateSchema's cross-session
    // uniqueness invariant. Build a second service instance sharing the same
    // stores but with its own session ID, exactly as the CLI command does.
    const resumeLifecycle = new WorkLifecycleService(workStore, sessionStore, {
      now: () => new Date(TIMESTAMP),
      sessionId: () => "session.resumed",
    });

    await expect(
      resumeLifecycle.resume({ kind: "task", id: task.entity.id }),
    ).resolves.toMatchObject({
      activeWork: { kind: "task", id: task.entity.id, startedAt: TIMESTAMP },
      sessionId: "session.resumed",
      workRevision: 7,
      sessionRevision: 3,
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          tasks: [{ id: task.entity.id, status: "active", pauseReason: null }],
          activeWork: { kind: "task", id: task.entity.id },
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: {
            id: "session.resumed",
            status: "active",
            activeWork: { kind: "task", id: task.entity.id },
          },
        },
      },
    });
  });

  it("rejects resuming a task that is not paused", async () => {
    const { lifecycle, task } = await createFixture();

    await expect(
      lifecycle.resume({ kind: "task", id: task.entity.id }),
    ).rejects.toMatchObject({
      code: "STATE_CONFLICT",
      details: { status: "planned" },
    });
  });

  it("rejects resuming while other work is active", async () => {
    const { issue, lifecycle, sessionStore, task, workStore } =
      await createFixture();
    await lifecycle.start({ kind: "task", id: task.entity.id });
    await lifecycle.pause("Paused for later.");
    const secondLifecycle = new WorkLifecycleService(workStore, sessionStore, {
      now: () => new Date(TIMESTAMP),
      sessionId: () => "session.second",
    });
    await secondLifecycle.start({ kind: "issue", id: issue.entity.id });

    await expect(
      secondLifecycle.resume({ kind: "task", id: task.entity.id }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });
});
