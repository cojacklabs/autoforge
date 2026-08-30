import { describe, expect, it } from "vitest";

import {
  sessionStateSchema,
  taskSchema,
  workScopeSchema,
  workStateSchema,
  workStatusSchema,
} from "../src/work/schemas.js";

const TIMESTAMP = "2026-08-19T22:00:00.000Z";

function validWorkState() {
  return {
    features: [
      {
        id: "feature.control-kernel",
        name: "Control kernel",
        description: "Manage persistent project work.",
        status: "active",
        pauseReason: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    phases: [
      {
        id: "phase.control-kernel.contracts",
        featureId: "feature.control-kernel",
        sequence: 1,
        name: "Domain contracts",
        description: "Define the work model.",
        status: "active",
        pauseReason: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    tasks: [
      {
        id: "task.control-kernel.contracts",
        phaseId: "phase.control-kernel.contracts",
        name: "Implement contracts",
        description: "Add validated domain schemas.",
        status: "active",
        pauseReason: null,
        scope: { include: ["src/work/**"], exclude: ["dist/**"] },
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    issues: [],
    activeWork: {
      kind: "task",
      id: "task.control-kernel.contracts",
      startedAt: TIMESTAMP,
    },
  } as const;
}

describe("control-kernel work schemas", () => {
  it("accepts a normalized feature, phase, and task hierarchy", () => {
    expect(workStateSchema.parse(validWorkState())).toEqual(validWorkState());
  });

  it("rejects orphaned phases and tasks", () => {
    const state = validWorkState();

    expect(
      workStateSchema.safeParse({
        ...state,
        phases: [{ ...state.phases[0], featureId: "feature.missing" }],
        tasks: [{ ...state.tasks[0], phaseId: "phase.missing" }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate IDs and multiple active items", () => {
    const state = validWorkState();

    expect(
      workStateSchema.safeParse({
        ...state,
        tasks: [state.tasks[0], state.tasks[0]],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate phase sequence numbers within a feature", () => {
    const state = validWorkState();

    expect(
      workStateSchema.safeParse({
        ...state,
        phases: [
          state.phases[0],
          {
            ...state.phases[0],
            id: "phase.control-kernel.duplicate",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires active status and activeWork to agree", () => {
    const state = validWorkState();

    expect(
      workStateSchema.safeParse({ ...state, activeWork: null }).success,
    ).toBe(false);
    expect(
      workStateSchema.safeParse({
        ...state,
        tasks: [{ ...state.tasks[0], status: "ready" }],
      }).success,
    ).toBe(false);
  });

  it("accepts standalone issues as active work", () => {
    const state = validWorkState();
    const issue = {
      id: "issue.fix-doctor",
      name: "Fix doctor",
      description: "Correct a focused diagnostic defect.",
      status: "active",
      pauseReason: null,
      scope: { include: ["src/commands/doctor.ts"] },
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    } as const;

    expect(
      workStateSchema.safeParse({
        ...state,
        tasks: [{ ...state.tasks[0], status: "ready" }],
        issues: [issue],
        activeWork: { kind: "issue", id: issue.id, startedAt: TIMESTAMP },
      }).success,
    ).toBe(true);
  });

  it("rejects absolute and parent-traversing scope patterns", () => {
    expect(
      workScopeSchema.safeParse({ include: ["/etc/passwd"] }).success,
    ).toBe(false);
    expect(
      workScopeSchema.safeParse({ include: ["src/../secret"] }).success,
    ).toBe(false);
    expect(workScopeSchema.safeParse({ include: ["C:\\secret"] }).success).toBe(
      false,
    );
  });
});

describe("control-kernel session schemas", () => {
  it("accepts one current session and ended history", () => {
    expect(
      sessionStateSchema.safeParse({
        current: {
          id: "session.current",
          status: "active",
          startedAt: TIMESTAMP,
          endedAt: null,
          activeWork: null,
        },
        previous: [
          {
            id: "session.previous",
            status: "ended",
            startedAt: "2026-08-19T20:00:00.000Z",
            endedAt: "2026-08-19T21:00:00.000Z",
            activeWork: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects contradictory session lifecycle state", () => {
    expect(
      sessionStateSchema.safeParse({
        current: {
          id: "session.invalid",
          status: "active",
          startedAt: TIMESTAMP,
          endedAt: "2026-08-19T21:00:00.000Z",
          activeWork: null,
        },
        previous: [],
      }).success,
    ).toBe(false);
  });

  it("rejects a mismatched active-work timestamp", () => {
    expect(
      sessionStateSchema.safeParse({
        current: {
          id: "session.mismatch",
          status: "active",
          startedAt: TIMESTAMP,
          endedAt: null,
          activeWork: {
            kind: "issue",
            id: "issue.mismatch",
            startedAt: "2026-08-19T21:00:00.000Z",
          },
        },
        previous: [],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate session IDs across current and history", () => {
    expect(
      sessionStateSchema.safeParse({
        current: {
          id: "session.duplicate",
          status: "active",
          startedAt: TIMESTAMP,
          endedAt: null,
          activeWork: null,
        },
        previous: [
          {
            id: "session.duplicate",
            status: "ended",
            startedAt: "2026-08-19T20:00:00.000Z",
            endedAt: "2026-08-19T21:00:00.000Z",
            activeWork: null,
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("paused work status", () => {
  it("accepts paused as a valid work status", () => {
    expect(workStatusSchema.safeParse("paused").success).toBe(true);
  });

  it("defaults pauseReason to null and accepts an explicit reason", () => {
    const base = {
      id: "task.example",
      phaseId: "phase.example",
      name: "Example",
      description: "Example task.",
      status: "paused",
      scope: { include: ["src/**"], exclude: [] },
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
    };
    expect(taskSchema.parse(base).pauseReason).toBeNull();
    expect(
      taskSchema.parse({ ...base, pauseReason: "Waiting on account access." })
        .pauseReason,
    ).toBe("Waiting on account access.");
  });

  it("rejects a blank pauseReason", () => {
    const base = {
      id: "task.example",
      phaseId: "phase.example",
      name: "Example",
      description: "Example task.",
      status: "paused",
      scope: { include: ["src/**"], exclude: [] },
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
      pauseReason: "   ",
    };
    expect(taskSchema.safeParse(base).success).toBe(false);
  });
});
