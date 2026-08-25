import { describe, expect, it, vi } from "vitest";

import { assessIntent, createAutoForgeSdk } from "../src/index.js";

describe("internal AutoForge SDK foundation", () => {
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
      operations: {
        status: async () => ({ status: "idle" as const }),
        startWork: async (input) => input,
        completeWork: async () => ({ completed: true }),
      },
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
    const startWork = vi.fn(async (input: { kind: "task"; id: string }) => ({
      activeWork: input,
      revision: 2,
    }));
    const completeWork = vi.fn(async () => ({
      completedWork: { kind: "task" as const, id: "task.sdk" },
      revision: 3,
    }));
    const sdk = createAutoForgeSdk({
      operations: { status, startWork, completeWork },
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

  it("does not translate errors from injected operations", async () => {
    const conflict = new Error("active work conflict");
    const sdk = createAutoForgeSdk({
      operations: {
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
