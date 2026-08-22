import { describe, expect, it } from "vitest";
import { createAgentDomainDirectives } from "../src/agents/governance.js";

describe("domain agent directives", () => {
  it("requires verified invariants and blocks violations", () => {
    const directives = createAgentDomainDirectives([
      {
        invariantId: "domain-invariant.a",
        status: "verified",
        reason: "confirmed",
      },
      {
        invariantId: "domain-invariant.b",
        status: "violated",
        reason: "broken",
      },
    ]);
    expect(directives.requiredActions).toHaveLength(1);
    expect(directives.prohibitedActions).toHaveLength(1);
  });
});
