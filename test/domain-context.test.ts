import { describe, expect, it } from "vitest";
import { ContextPacketCompiler } from "../src/context/packet.js";
import { contextSelectionSchema } from "../src/context/schemas.js";

describe("domain context delivery", () => {
  it("renders domain concepts in the context packet", () => {
    const selection = contextSelectionSchema.parse({
      work: {
        kind: "task",
        item: {
          id: "task.domain",
          phaseId: "phase.domain",
          name: "Domain",
          description: "Domain task.",
          status: "active",
          createdAt: "2026-08-22T00:00:00Z",
          updatedAt: "2026-08-22T00:00:00Z",
          scope: { include: ["src/domain/**"], exclude: [] },
        },
        phase: {
          id: "phase.domain",
          featureId: "feature.domain",
          sequence: 1,
          name: "Domain",
          description: "Domain.",
          status: "active",
          createdAt: "2026-08-22T00:00:00Z",
          updatedAt: "2026-08-22T00:00:00Z",
        },
        feature: {
          id: "feature.domain",
          name: "Domain",
          description: "Domain.",
          status: "active",
          createdAt: "2026-08-22T00:00:00Z",
          updatedAt: "2026-08-22T00:00:00Z",
        },
        startedAt: "2026-08-22T00:00:00Z",
        objective: "Use domain",
        reasons: ["test"],
        estimatedTokens: 10,
      },
      doctrines: [],
      decisions: [],
      specs: [],
      exclusions: [],
      budget: {
        maxTokens: 100,
        usedTokens: 10,
        remainingTokens: 90,
        exceeded: false,
      },
      domain: [
        {
          id: "domain.user",
          name: "User",
          description: "Account.",
          lifecycle: "confirmed",
        },
      ],
    });
    expect(new ContextPacketCompiler().compile(selection).content).toContain(
      "domain.user",
    );
  });
});
