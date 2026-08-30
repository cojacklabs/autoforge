import { describe, expect, it } from "vitest";
import { ContextPacketCompiler } from "../src/context/packet.js";

describe("governance context integration", () => {
  it("renders selected governance without creating a second packet", () => {
    const selection = {
      work: {
        kind: "issue" as const,
        item: {
          id: "issue.governance-context",
          name: "Governance context",
          description: "Validate governance packet rendering.",
          status: "active" as const,
          pauseReason: null,
          scope: { include: ["src/context/**"], exclude: [] },
          createdAt: "2026-08-21T00:00:00.000Z",
          updatedAt: "2026-08-21T00:00:00.000Z",
        },
        startedAt: "2026-08-21T00:00:00.000Z",
        objective: "Validate governance packet rendering.",
        reasons: ["active work"],
        estimatedTokens: 10,
      },
      doctrines: [],
      decisions: [],
      specs: [],
      governance: [
        {
          status: "blocked" as const,
          ruleId: "constitution.release.no-billing",
          reason: "The objective conflicts with the release boundary.",
        },
      ],
      exclusions: [],
      budget: {
        maxTokens: 100,
        usedTokens: 10,
        remainingTokens: 90,
        exceeded: false,
      },
    };
    const packet = new ContextPacketCompiler().compile(selection);
    expect(packet.id).toBe("packet.issue.governance-context");
    expect(packet.content).toContain("## Applicable Governance");
    expect(packet.content).toContain("constitution.release.no-billing");
  });
});
