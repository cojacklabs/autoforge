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

  it("does not defer a current intent for a later additive extension", () => {
    const result = triageIntent({
      raw: "Build account matching now. Email can be added in a later, additive channel.",
      objective: "Implement deterministic account matching.",
      requirements: ["Match verified accounts."],
      assumptions: [],
      unknowns: [],
      constraints: [],
      acceptanceCriteria: ["Matching tests pass."],
    });
    expect(result.labels).not.toContain("DEFERRED");
  });

  it("does not detect conflicts across unrelated sentences or fields", () => {
    const result = triageIntent({
      raw: "Never produce a match record without verified evidence.",
      objective: "Implement deterministic account matching.",
      requirements: ["Reject unverified candidates."],
      assumptions: ["Email is related but separately scoped."],
      unknowns: [],
      constraints: [],
      acceptanceCriteria: ["No unverified match is persisted."],
    });
    expect(result.labels).not.toContain("CONFLICT_DETECTED");
    expect(result.conflict).toBe(false);
  });
});
