import { describe, expect, it, vi } from "vitest";

import type { AgentRuntime } from "../src/runtime.js";
import type { AgentPlan } from "../src/schemas.js";
import {
  runAgentSession,
  type AgentProjectGateway,
  type AgentSessionIo,
  type AgentWorkspace,
} from "../src/session.js";

const finalPlan: AgentPlan = {
  summary: "Add the approved feature",
  clarificationQuestions: [],
  edits: [
    {
      path: "apps/agent-cli/example.txt",
      description: "Add an example",
      content: "approved\n",
    },
  ],
  validationPaths: ["apps/agent-cli/example.txt"],
  risks: ["Experimental behavior"],
  openQuestions: [],
  nextAction: "Review the handoff",
};

function createHarness(
  options: { approved?: boolean; allowed?: boolean } = {},
) {
  const plans: AgentPlan[] = [
    { ...finalPlan, clarificationQuestions: ["Which behavior?"] },
    finalPlan,
  ];
  const runtime: AgentRuntime = {
    plan: vi.fn(async () => plans.shift() ?? finalPlan),
    async *streamCompletion() {
      yield "Completed ";
      yield "safely.";
    },
  };
  const gateway: AgentProjectGateway = {
    status: vi.fn(
      async () =>
        ({
          project: { id: "project.autoforge", name: "autoforge" },
          session: { id: "session.test" },
          activeWork: {
            kind: "task",
            id: "task.test",
            name: "Test task",
            objective: "Test task",
          },
          scope: { include: ["apps/agent-cli/**"], exclude: [] },
          git: { head: "abc123", branch: "main" },
          contextFingerprint: "a".repeat(64),
        }) satisfies import("../src/session.js").AgentStatus,
    ),
    context: vi.fn(async () => "canonical context"),
    check: vi.fn(async () => ({
      allowed: options.allowed ?? true,
      summary: options.allowed === false ? "outside scope" : "allowed",
    })),
    validate: vi.fn(async () => ({ passed: true, summary: "tests passed" })),
    handoff: vi.fn(async () => ({ location: ".autoforge/handoffs/test.json" })),
  };
  const workspace: AgentWorkspace = { write: vi.fn(async () => undefined) };
  const output: string[] = [];
  const io: AgentSessionIo = {
    write: (value) => output.push(value),
    ask: vi.fn(async () => "Use the safe behavior"),
    confirm: vi.fn(async () => options.approved ?? true),
  };
  return { runtime, gateway, workspace, io, output };
}

describe("runAgentSession", () => {
  it("clarifies, obtains approval, applies bounded edits, validates, streams, and hands off", async () => {
    const harness = createHarness();
    const result = await runAgentSession({
      ...harness,
      prompt: "Build the feature",
    });

    expect(result).toMatchObject({
      status: "completed",
      changedFiles: ["apps/agent-cli/example.txt"],
      handoffLocation: ".autoforge/handoffs/test.json",
    });
    expect(harness.runtime.plan).toHaveBeenCalledTimes(2);
    expect(harness.workspace.write).toHaveBeenCalledWith(
      "apps/agent-cli/example.txt",
      "approved\n",
    );
    expect(harness.gateway.validate).toHaveBeenCalledWith([
      "apps/agent-cli/example.txt",
    ]);
    expect(harness.gateway.handoff).toHaveBeenCalledWith(
      expect.objectContaining({
        contextFingerprint: "a".repeat(64),
        risks: ["Experimental behavior"],
      }),
    );
    expect(harness.output.join("")).toContain("Plan: Add the approved feature");
    expect(harness.output.join("")).toContain("Completed safely.");
  });

  it("does not write when approval is declined", async () => {
    const harness = createHarness({ approved: false });
    const result = await runAgentSession({ ...harness, prompt: "Build it" });

    expect(result.status).toBe("approval-declined");
    expect(harness.workspace.write).not.toHaveBeenCalled();
    expect(harness.gateway.validate).not.toHaveBeenCalled();
  });

  it("preflights every guardrail before writing", async () => {
    const harness = createHarness({ allowed: false });
    await expect(
      runAgentSession({ ...harness, prompt: "Build it" }),
    ).rejects.toThrow("AutoForge blocked");
    expect(harness.workspace.write).not.toHaveBeenCalled();
  });

  it("rejects paths that escape the project before calling the guardrail", async () => {
    const harness = createHarness();
    const unsafe = {
      ...finalPlan,
      edits: [{ ...finalPlan.edits[0]!, path: "../secret" }],
    };
    harness.runtime.plan = vi.fn(async () => unsafe);
    await expect(
      runAgentSession({ ...harness, prompt: "Build it" }),
    ).rejects.toThrow("escapes the project");
    expect(harness.gateway.check).not.toHaveBeenCalled();
    expect(harness.workspace.write).not.toHaveBeenCalled();
  });
});
