import { describe, expect, it } from "vitest";

import { createWorkflowHandoff } from "../src/workflows/handoff.js";

describe("workflow handoffs", () => {
  it("creates a validated cross-stage handoff", () => {
    const handoff = createWorkflowHandoff(
      {
        workflowId: "feature.checkout",
        workflowKind: "feature-development",
        fromStage: "research",
        toStage: "planning",
        objective: "Deliver card checkout.",
        completedWork: ["Compared payment providers."],
        decisions: ["Prefer provider A."],
        openQuestions: ["Confirm webhook retry policy."],
        validation: ["Research sources are recorded."],
        sourceArtifacts: ["research.payment-provider"],
      },
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(handoff.createdAt).toBe("2026-08-20T00:00:00.000Z");
    expect(handoff.toStage).toBe("planning");
  });
});
