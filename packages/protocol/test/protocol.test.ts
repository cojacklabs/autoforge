import { describe, expect, it } from "vitest";

import {
  AUTOFORGE_PROTOCOL_VERSION,
  AutoForgeError,
  UnsupportedProtocolVersionError,
  assertSupportedProtocolVersion,
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
