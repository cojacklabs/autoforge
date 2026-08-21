import { describe, expect, it } from "vitest";

import { validateAgentContract } from "../src/contract/schema.js";

describe("agent contract", () => {
  it("validates the canonical execution contract", () => {
    const contract = validateAgentContract({
      version: "0.10.0",
      agentId: "codex",
      projectRoot: "/workspace/project",
      activeWorkId: "task.checkout",
      workflowKind: "feature-development",
      workflowStage: "implementation",
      requiredActions: ["Read the active context packet."],
      prohibitedActions: ["Modify files outside the declared scope."],
      contextCommand: "npx --no-install autoforge context --explain",
      validationCommands: ["npm test"],
      completionRequirements: ["Persist decisions before completion."],
    });
    expect(contract.agentId).toBe("codex");
  });
});
