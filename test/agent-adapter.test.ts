import { describe, expect, it } from "vitest";

import {
  agentContextDeliveryResultSchema,
  agentContextPayloadSchema,
  agentDetectionSchema,
  agentHealthSchema,
  agentSetupResultSchema,
  validateAgentAdapterDefinition,
  type AgentAdapter,
} from "../src/agents/adapter.js";

const context = { projectRoot: "/workspace/project" };

const fakeAdapter: AgentAdapter = {
  id: "test-agent",
  displayName: "Test Agent",
  capabilities: {
    setup: "automatic",
    contextDelivery: ["file"],
    enforcement: "advisory",
  },
  async detect() {
    return { detected: true, confidence: "high", evidence: ["test marker"] };
  },
  async setup() {
    return { status: "configured", changes: ["AGENTS.md"], instructions: null };
  },
  async deliverContext() {
    return {
      status: "delivered",
      mode: "file",
      artifacts: [".autoforge/context.md"],
      message: null,
    };
  },
  async healthCheck() {
    return {
      status: "healthy",
      checks: [{ id: "configuration", status: "pass", message: "Ready." }],
    };
  },
};

describe("agent adapter contract", () => {
  it("supports a concrete adapter without importing concrete agents", async () => {
    expect(() => validateAgentAdapterDefinition(fakeAdapter)).not.toThrow();
    expect(
      agentDetectionSchema.parse(await fakeAdapter.detect(context)),
    ).toMatchObject({
      detected: true,
      confidence: "high",
    });
    expect(
      agentSetupResultSchema.parse(await fakeAdapter.setup(context)),
    ).toMatchObject({
      status: "configured",
    });
    expect(
      agentContextDeliveryResultSchema.parse(
        await fakeAdapter.deliverContext(context, {
          id: "context.task-example",
          content: "# Task context",
          format: "markdown",
        }),
      ),
    ).toMatchObject({ status: "delivered", mode: "file" });
    expect(
      agentHealthSchema.parse(await fakeAdapter.healthCheck(context)),
    ).toMatchObject({
      status: "healthy",
    });
  });

  it("rejects dishonest detection, delivery, and health results", () => {
    expect(
      agentDetectionSchema.safeParse({
        detected: true,
        confidence: "none",
        evidence: [],
      }).success,
    ).toBe(false);
    expect(
      agentContextDeliveryResultSchema.safeParse({
        status: "delivered",
        mode: null,
        artifacts: [],
        message: null,
      }).success,
    ).toBe(false);
    expect(
      agentHealthSchema.safeParse({
        status: "healthy",
        checks: [{ id: "setup", status: "fail", message: "Missing." }],
      }).success,
    ).toBe(false);
  });

  it("requires actionable manual setup and unsupported delivery results", () => {
    expect(
      agentSetupResultSchema.safeParse({
        status: "manual-required",
        changes: [],
        instructions: null,
      }).success,
    ).toBe(false);
    expect(
      agentContextDeliveryResultSchema.safeParse({
        status: "unsupported",
        mode: null,
        artifacts: [],
        message: null,
      }).success,
    ).toBe(false);
    expect(
      agentSetupResultSchema.safeParse({
        status: "configured",
        changes: ["../outside.md"],
        instructions: null,
      }).success,
    ).toBe(false);
  });

  it("validates bounded transport-neutral context payloads", () => {
    expect(
      agentContextPayloadSchema.safeParse({
        id: "context.task-example",
        content: "# Task context",
        format: "markdown",
        estimatedTokens: 120,
      }).success,
    ).toBe(true);
    expect(
      agentContextPayloadSchema.safeParse({
        id: "context.empty",
        content: "",
        format: "markdown",
      }).success,
    ).toBe(false);
  });
});
