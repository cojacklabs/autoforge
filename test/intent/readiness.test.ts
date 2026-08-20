import { describe, expect, it } from "vitest";

import { evaluateReadiness } from "../../src/intent/readiness.js";

const base = {
  raw: "Build checkout.",
  objective: "Allow customers to pay.",
  requirements: ["Support cards"],
  assumptions: [],
  unknowns: [],
  constraints: [],
  acceptanceCriteria: ["A successful payment is recorded."],
};

describe("explainable readiness", () => {
  it("returns ready with complete implementation evidence", () => {
    expect(evaluateReadiness(base, "implementation")).toEqual({
      workKind: "implementation",
      level: "ready",
      confidence: 100,
      known: ["Objective", "Requirements", "Acceptance criteria"],
      missing: [],
      blockers: [],
    });
  });

  it("reports missing evidence and unresolved blockers", () => {
    expect(
      evaluateReadiness(
        {
          ...base,
          objective: undefined,
          acceptanceCriteria: [],
          unknowns: ["Provider"],
        },
        "implementation",
      ),
    ).toMatchObject({
      level: "needs-input",
      confidence: 33,
      missing: ["Objective", "Acceptance criteria"],
      blockers: ["Unresolved: Provider"],
    });
  });

  it("uses a distinct evidence profile for research", () => {
    expect(
      evaluateReadiness(
        {
          ...base,
          requirements: [],
          acceptanceCriteria: [],
          unknowns: ["Provider"],
        },
        "research",
      ),
    ).toMatchObject({
      level: "ready",
      confidence: 100,
      known: ["Objective", "Research questions"],
    });
  });
});
