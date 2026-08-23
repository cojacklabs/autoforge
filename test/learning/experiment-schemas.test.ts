import { describe, expect, it } from "vitest";
import { experimentSchema } from "../../src/learning/experiment-schemas.js";

const TIMESTAMP = "2026-08-22T00:00:00.000Z";

function baseExperiment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "experiment.onboarding-ab-test",
    hypothesisIds: ["hypothesis.faster-onboarding-increases-activation"],
    method: "A/B test",
    status: "planned",
    startedAt: TIMESTAMP,
    endedAt: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("experiment schema", () => {
  it("accepts a fully specified experiment", () => {
    expect(experimentSchema.parse(baseExperiment())).toMatchObject({
      status: "planned",
      method: "A/B test",
    });
  });

  it("accepts multiple hypothesisIds", () => {
    expect(
      experimentSchema.parse(
        baseExperiment({
          hypothesisIds: ["hypothesis.a", "hypothesis.b"],
        }),
      ),
    ).toMatchObject({ hypothesisIds: ["hypothesis.a", "hypothesis.b"] });
  });

  it("rejects an empty hypothesisIds array", () => {
    expect(() =>
      experimentSchema.parse(baseExperiment({ hypothesisIds: [] })),
    ).toThrow();
  });

  it("rejects duplicate hypothesisIds", () => {
    expect(() =>
      experimentSchema.parse(
        baseExperiment({
          hypothesisIds: [
            "hypothesis.faster-onboarding-increases-activation",
            "hypothesis.faster-onboarding-increases-activation",
          ],
        }),
      ),
    ).toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      experimentSchema.parse(baseExperiment({ status: "done" })),
    ).toThrow();
  });
});
