import { describe, expect, it } from "vitest";

import { triageIntent } from "../../src/intent/triage.js";

describe("deterministic intent triage", () => {
  it("marks complete implementation intent ready", () => {
    expect(
      triageIntent({
        raw: "Add checkout.",
        objective: "Allow customers to pay.",
        requirements: ["Support cards"],
        assumptions: [],
        unknowns: [],
        constraints: [],
        acceptanceCriteria: ["A successful payment is recorded."],
      }),
    ).toMatchObject({ labels: ["READY_FOR_IMPLEMENTATION"], conflict: false });
  });

  it("returns additive research and clarification labels", () => {
    const result = triageIntent({
      raw: "Research which payment provider to use.",
      objective: "Choose a provider.",
      requirements: [],
      assumptions: [],
      unknowns: ["Regional availability"],
      constraints: [],
      acceptanceCriteria: [],
    });
    expect(result.labels).toEqual([
      "RESEARCH_REQUIRED",
      "CLARIFICATION_REQUIRED",
    ]);
  });

  it("detects independent design and architecture needs", () => {
    expect(
      triageIntent({
        raw: "Design the checkout screen and API integration.",
        objective: "Create checkout.",
        requirements: ["Use the payment API"],
        assumptions: [],
        unknowns: [],
        constraints: [],
        acceptanceCriteria: [],
      }).labels,
    ).toEqual(["ARCHITECTURE_REQUIRED", "DESIGN_REQUIRED"]);
  });

  it("reports deferred conflicts without collapsing labels", () => {
    const result = triageIntent({
      raw: "Always use the current provider unless legal says otherwise; defer this later.",
      objective: "Choose a provider.",
      requirements: [],
      assumptions: [],
      unknowns: [],
      constraints: [],
      acceptanceCriteria: [],
    });
    expect(result.labels).toEqual(["DEFERRED", "CONFLICT_DETECTED"]);
    expect(result.conflict).toBe(true);
  });
});
