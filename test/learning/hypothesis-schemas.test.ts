import { describe, expect, it } from "vitest";
import { hypothesisSchema } from "../../src/learning/hypothesis-schemas.js";

const TIMESTAMP = "2026-08-22T00:00:00.000Z";

function baseHypothesis(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "hypothesis.faster-onboarding-increases-activation",
    statement: "A shorter onboarding flow increases activation.",
    expectedOutcome: "New users reach first value faster.",
    metric: "activation rate",
    target: ">= 40% within 7 days",
    linkedFeature: "feature.onboarding-redesign",
    status: "proposed",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("hypothesis schema", () => {
  it("accepts a fully specified hypothesis", () => {
    expect(hypothesisSchema.parse(baseHypothesis())).toMatchObject({
      status: "proposed",
      metric: "activation rate",
    });
  });

  it("accepts a null linkedFeature", () => {
    expect(
      hypothesisSchema.parse(baseHypothesis({ linkedFeature: null })),
    ).toMatchObject({ linkedFeature: null });
  });

  it("rejects an unknown status", () => {
    expect(() =>
      hypothesisSchema.parse(baseHypothesis({ status: "maybe" })),
    ).toThrow();
  });

  it("rejects an empty statement", () => {
    expect(() =>
      hypothesisSchema.parse(baseHypothesis({ statement: "" })),
    ).toThrow();
  });

  it("rejects a malformed id", () => {
    expect(() =>
      hypothesisSchema.parse(baseHypothesis({ id: "not-a-hypothesis-id" })),
    ).toThrow();
  });
});
