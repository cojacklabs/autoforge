import { describe, expect, it } from "vitest";
import { createAgentGovernanceDirectives } from "../src/agents/governance.js";

describe("agent governance directives", () => {
  it("delivers identical scoped directives to every adapter", () => {
    const evaluations = [
      {
        status: "pass" as const,
        ruleId: "constitution.product.scope",
        reason: "The objective is within release scope.",
      },
      {
        status: "blocked" as const,
        ruleId: "constitution.release.no-billing",
        reason: "Billing is outside the approved release.",
      },
    ];
    const first = createAgentGovernanceDirectives(evaluations);
    const second = createAgentGovernanceDirectives(evaluations);
    expect(first).toEqual(second);
    expect(first.requiredActions).toHaveLength(1);
    expect(first.prohibitedActions).toHaveLength(1);
  });
});
