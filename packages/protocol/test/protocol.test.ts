import { describe, expect, it } from "vitest";

import {
  AUTOFORGE_PROTOCOL_VERSION,
  AutoForgeError,
  UnsupportedProtocolVersionError,
  assertSupportedProtocolVersion,
  agentHandoffSchema,
  createAgentHandoff,
  createWorkflowHandoff,
  featureIdSchema,
  validateAgentContract,
  workflowHandoffSchema,
} from "../src/index.js";

describe("AutoForge protocol v1", () => {
  it("publishes a wire version independent from the package version", () => {
    expect(AUTOFORGE_PROTOCOL_VERSION).toBe("1");
    expect(() => assertSupportedProtocolVersion("1")).not.toThrow();
  });

  it("rejects unsupported versions with actionable structured details", () => {
    expect(() => assertSupportedProtocolVersion("2")).toThrowError(
      UnsupportedProtocolVersionError,
    );
    try {
      assertSupportedProtocolVersion("2");
    } catch (error) {
      expect(error).toMatchObject({
        code: "UNSUPPORTED_PROTOCOL_VERSION",
        receivedVersion: "2",
        supportedVersions: ["1"],
      });
    }
  });

  it("validates stable identifiers", () => {
    expect(featureIdSchema.parse("feature.checkout")).toBe("feature.checkout");
    expect(() => featureIdSchema.parse("task.checkout")).toThrow();
  });

  it("serializes errors without exposing their cause", () => {
    const error = new AutoForgeError("INVALID_STATE", "State is stale", {
      cause: new Error("private detail"),
      details: { action: "refresh" },
    });
    expect(error.toEnvelope()).toEqual({
      protocolVersion: "1",
      code: "INVALID_STATE",
      message: "State is stale",
      details: { action: "refresh" },
    });
  });

  it("accepts legacy handoffs and emits the additive protocol version", () => {
    const legacy = {
      workflowId: "feature.checkout",
      workflowKind: "feature-development",
      fromStage: "research",
      toStage: "planning",
      objective: "Deliver checkout.",
      completedWork: [],
      decisions: [],
      openQuestions: [],
      validation: [],
      sourceArtifacts: [],
      createdAt: "2026-08-25T00:00:00.000Z",
    };
    expect(workflowHandoffSchema.parse(legacy).protocolVersion).toBe("1");
    expect(
      createWorkflowHandoff(
        {
          workflowId: legacy.workflowId,
          workflowKind: legacy.workflowKind,
          fromStage: legacy.fromStage,
          toStage: legacy.toStage,
          objective: legacy.objective,
          completedWork: legacy.completedWork,
          decisions: legacy.decisions,
          openQuestions: legacy.openQuestions,
          validation: legacy.validation,
          sourceArtifacts: legacy.sourceArtifacts,
        },
        new Date("2026-08-25T00:00:00.000Z"),
      ).protocolVersion,
    ).toBe("1");
  });

  it("validates provider-neutral cross-agent handoffs without transcripts", () => {
    const handoff = createAgentHandoff(
      {
        id: "handoff.claude-to-codex",
        project: { id: "project.autoforge", name: "autoforge" },
        session: {
          id: "session.claude",
          fromAgent: "claude",
          toAgent: "codex",
        },
        activeWork: {
          kind: "task",
          id: "task.structured-handoff",
          name: "Structured handoff",
          objective: "Transfer project truth without a transcript.",
        },
        scope: { include: ["packages/**"], exclude: ["dist/**"] },
        git: { head: "abc123", branch: "main" },
        changedFiles: [
          { path: "packages/protocol/src/handoff.ts", status: "added" },
        ],
        decisions: [
          {
            id: "decision.structured-handoffs",
            statement: "Use structured state.",
          },
        ],
        validation: [
          { gateId: "protocol", status: "passed", summary: "Schema passed." },
        ],
        risks: [],
        openQuestions: ["Should hosted sync remain deferred?"],
        nextAction: "Continue with the Agent CLI.",
        contextFingerprint: "a".repeat(64),
      },
      new Date("2026-08-25T00:00:00.000Z"),
    );
    expect(handoff.protocolVersion).toBe("1");
    expect(handoff.session).toMatchObject({
      fromAgent: "claude",
      toAgent: "codex",
    });
    expect(() =>
      agentHandoffSchema.parse({ ...handoff, rawTranscript: "secret" }),
    ).toThrow();
    expect(() =>
      agentHandoffSchema.parse({
        ...handoff,
        changedFiles: [{ path: "../outside", status: "modified" }],
      }),
    ).toThrow();
    for (const scope of [
      { include: ["../outside/**"], exclude: [] },
      { include: ["/absolute/**"], exclude: [] },
      { include: ["C:\\outside\\**"], exclude: [] },
      { include: ["packages/**"], exclude: ["\\\\server\\share\\**"] },
    ]) {
      expect(() => agentHandoffSchema.parse({ ...handoff, scope })).toThrow(
        "Scope patterns must be repository-relative",
      );
    }
  });

  it("preserves the released agent contract shape", () => {
    expect(
      validateAgentContract({
        version: "0.11.0",
        agentId: "codex",
        projectRoot: "/workspace/project",
        requiredActions: [],
        prohibitedActions: [],
        contextCommand: "autoforge context",
        validationCommands: [],
        completionRequirements: [],
      }).version,
    ).toBe("0.11.0");
  });
});
