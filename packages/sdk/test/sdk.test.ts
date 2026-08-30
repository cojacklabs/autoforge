import { describe, expect, it, vi } from "vitest";

import {
  assessIntent,
  createAutoForgeSdk,
  getSdkCapabilities,
  inspectProjectAttachment,
  readProjectStatus,
} from "../src/index.js";

function supportedOperations() {
  return {
    projects: async () => ({ projects: [] }),
    status: async () => ({ status: "idle" as const }),
    work: async () => ({ work: [] }),
    context: async () => ({ packet: "context" }),
    check: async () => ({ allowed: true }),
    assignments: async () => ({ assignments: [] }),
    decisions: async () => ({ decisionId: "decision.sdk" }),
    validation: async () => ({ passed: true }),
    handoffs: async () => ({ handoffId: "handoff.sdk" }),
    startWork: async (input: { kind: "task" | "issue"; id: string }) => input,
    completeWork: async () => ({ completed: true }),
  };
}

function handoffInput() {
  return {
    id: "handoff.claude-to-codex",
    project: { id: "project.autoforge", name: "autoforge" },
    session: {
      id: "session.claude",
      fromAgent: "claude",
      toAgent: "codex",
    },
    activeWork: {
      kind: "task" as const,
      id: "task.structured-handoff",
      name: "Structured handoff",
      objective: "Transfer project truth.",
    },
    scope: { include: ["packages/**"], exclude: [] },
    git: { head: "abc123" },
    changedFiles: [],
    decisions: [],
    validation: [],
    risks: [],
    openQuestions: [],
    nextAction: "Continue in Codex.",
    contextFingerprint: "a".repeat(64),
  };
}

describe("internal AutoForge SDK foundation", () => {
  it("advertises the supported protocol operation surface", () => {
    expect(getSdkCapabilities()).toEqual({
      protocolVersion: "1",
      data: {
        protocolVersion: "1",
        operations: [
          "projects",
          "status",
          "intent",
          "work",
          "context",
          "checks",
          "assignments",
          "decisions",
          "validation",
          "handoffs",
          "completion",
        ],
      },
    });
  });

  it("returns structured attachment inspection without owning effects", async () => {
    await expect(
      inspectProjectAttachment(async () => ({
        requestedPath: "/projects/demo/packages/app",
        resolvedRoot: "/projects/demo",
        repositoryKind: "git",
        installationStatus: "absent",
        registrationStatus: "unregistered",
        actions: ["initialize", "register"],
        conflicts: [],
      })),
    ).resolves.toMatchObject({
      protocolVersion: "1",
      data: {
        resolvedRoot: "/projects/demo",
        actions: ["initialize", "register"],
      },
    });
  });

  it("returns structured project status through an injected reader", async () => {
    await expect(
      readProjectStatus(async () => ({
        project: { name: "demo", root: "/projects/demo" },
        work: {
          state: "idle",
          active: null,
          counts: {
            planned: 2,
            ready: 0,
            active: 0,
            blocked: 0,
            paused: 0,
            completed: 3,
            canceled: 0,
          },
        },
        nextCommands: ["autoforge start task task.next", "autoforge help"],
      })),
    ).resolves.toEqual({
      protocolVersion: "1",
      data: {
        project: { name: "demo", root: "/projects/demo" },
        work: {
          state: "idle",
          active: null,
          counts: {
            planned: 2,
            ready: 0,
            active: 0,
            blocked: 0,
            paused: 0,
            completed: 3,
            canceled: 0,
          },
        },
        nextCommands: ["autoforge start task task.next", "autoforge help"],
      },
    });
  });

  it("offers deterministic intent assessment without lifecycle adapters", () => {
    const result = assessIntent(
      {
        intent: {
          raw: "Move the command router.",
          objective: "Move the CLI behind the SDK.",
          requirements: ["Preserve compatibility"],
          assumptions: [],
          unknowns: [],
          constraints: [],
          acceptanceCriteria: ["Existing commands still pass."],
        },
        workKind: "implementation",
        artifacts: [],
      },
      { now: () => new Date("2026-08-25T00:00:00.000Z") },
    );

    expect(result.protocolVersion).toBe("1");
    expect(result.data.triage.labels).toEqual(["READY_FOR_IMPLEMENTATION"]);
  });

  it("returns deterministic Core assessments in a protocol envelope", () => {
    const sdk = createAutoForgeSdk({
      clock: { now: () => new Date("2026-08-25T00:00:00.000Z") },
      operations: supportedOperations(),
    });

    const result = sdk.assessIntent({
      intent: {
        raw: "Build checkout.",
        objective: "Accept card payments.",
        requirements: ["Support cards"],
        assumptions: [],
        unknowns: [],
        constraints: [],
        acceptanceCriteria: ["Payments are recorded."],
      },
      workKind: "implementation",
      artifacts: ["feature-brief"],
    });

    expect(result.protocolVersion).toBe("1");
    expect(result.data.triage.labels).toEqual(["READY_FOR_IMPLEMENTATION"]);
    expect(result.data.artifacts[0]?.generatedAt).toBe(
      "2026-08-25T00:00:00.000Z",
    );
  });

  it("delegates lifecycle effects and preserves structured results", async () => {
    const status = vi.fn(async () => ({ status: "idle" as const }));
    const startWork = vi.fn(
      async (input: { kind: "task" | "issue"; id: string }) => ({
        activeWork: input,
        revision: 2,
      }),
    );
    const completeWork = vi.fn(async () => ({
      completedWork: { kind: "task" as const, id: "task.sdk" },
      revision: 3,
    }));
    const sdk = createAutoForgeSdk({
      operations: {
        ...supportedOperations(),
        status,
        startWork,
        completeWork,
      },
    });

    await expect(sdk.status()).resolves.toEqual({
      protocolVersion: "1",
      data: { status: "idle" },
    });
    await expect(
      sdk.startWork({ kind: "task", id: "task.sdk" }),
    ).resolves.toEqual({
      protocolVersion: "1",
      data: {
        activeWork: { kind: "task", id: "task.sdk" },
        revision: 2,
      },
    });
    await expect(sdk.completeWork()).resolves.toEqual({
      protocolVersion: "1",
      data: {
        completedWork: { kind: "task", id: "task.sdk" },
        revision: 3,
      },
    });
    expect(startWork).toHaveBeenCalledWith({
      kind: "task",
      id: "task.sdk",
    });
  });

  it("delegates the complete supported lifecycle without terminal formatting", async () => {
    const operations = {
      projects: vi.fn(async (input) => ({ action: input.action })),
      status: vi.fn(async () => ({ state: "idle" as const })),
      work: vi.fn(async (input) => ({ action: input.action })),
      context: vi.fn(async (input) => ({ explained: input.explain ?? false })),
      check: vi.fn(async (input) => ({ path: input.path ?? null })),
      assignments: vi.fn(async (input) => ({ action: input.action })),
      decisions: vi.fn(async (input) => ({ statement: input.statement })),
      validation: vi.fn(async (input) => ({ paths: input.paths ?? [] })),
      handoffs: vi.fn(async (input) => ({ handoff: input.handoff })),
      startWork: vi.fn(async (input) => ({ active: input })),
      completeWork: vi.fn(async (input) => ({ completion: input })),
    };
    const sdk = createAutoForgeSdk({ operations });

    await expect(sdk.projects({ action: "list" })).resolves.toMatchObject({
      protocolVersion: "1",
      data: { action: "list" },
    });
    await expect(
      sdk.work({ action: "show", id: "task.sdk" }),
    ).resolves.toMatchObject({
      data: { action: "show" },
    });
    await expect(sdk.context({ explain: true })).resolves.toMatchObject({
      data: { explained: true },
    });
    await expect(sdk.check({ path: "src/index.ts" })).resolves.toMatchObject({
      data: { path: "src/index.ts" },
    });
    await expect(sdk.assignments({ action: "ready" })).resolves.toMatchObject({
      data: { action: "ready" },
    });
    await expect(
      sdk.decisions({
        statement: "Use the SDK.",
        reasoning: "Avoid terminal parsing.",
        consequences: ["Agents use structured values."],
        scope: ["sdk"],
        keywords: ["sdk"],
        relatedWork: ["task.sdk"],
      }),
    ).resolves.toMatchObject({ data: { statement: "Use the SDK." } });
    await expect(
      sdk.validation({ paths: ["src/index.ts"] }),
    ).resolves.toMatchObject({
      data: { paths: ["src/index.ts"] },
    });
    await expect(
      sdk.handoffs({ handoff: handoffInput() }),
    ).resolves.toMatchObject({
      data: { handoff: { nextAction: "Continue in Codex." } },
    });
    await expect(
      sdk.completeWork({ decisionId: "decision.sdk" }),
    ).resolves.toMatchObject({
      data: { completion: { decisionId: "decision.sdk" } },
    });
  });

  it("does not translate errors from injected operations", async () => {
    const conflict = new Error("active work conflict");
    const sdk = createAutoForgeSdk({
      operations: {
        ...supportedOperations(),
        status: async () => ({ status: "idle" }),
        startWork: async () => {
          throw conflict;
        },
        completeWork: async () => ({ completed: true }),
      },
    });

    await expect(sdk.startWork({ kind: "task", id: "task.sdk" })).rejects.toBe(
      conflict,
    );
  });
});
