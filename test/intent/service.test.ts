import { describe, expect, it } from "vitest";

import { IntentApplicationService } from "../../src/intent/service.js";

describe("intent application service", () => {
  it("composes triage, readiness, and modular artifacts", () => {
    const service = new IntentApplicationService({
      now: () => new Date("2026-08-20T12:00:00.000Z"),
    });
    const result = service.assess({
      intent: {
        raw: "Build checkout.",
        objective: "Allow customers to pay.",
        requirements: ["Support cards"],
        assumptions: [],
        unknowns: [],
        constraints: [],
        acceptanceCriteria: ["Successful payments are recorded."],
      },
      workKind: "implementation",
      artifacts: ["feature-brief", "acceptance-criteria"],
    });

    expect(result.triage.labels).toEqual(["READY_FOR_IMPLEMENTATION"]);
    expect(result.readiness.level).toBe("ready");
    expect(result.artifacts.map((artifact) => artifact.kind)).toEqual([
      "feature-brief",
      "acceptance-criteria",
    ]);
    expect(result.artifacts[0]?.generatedAt).toBe("2026-08-20T12:00:00.000Z");
  });
});
