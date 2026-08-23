import { describe, expect, it } from "vitest";
import { evidenceSchema } from "../../src/learning/evidence-schemas.js";

const TIMESTAMP = "2026-08-22T00:00:00.000Z";

function baseEvidence(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "evidence.beta-cohort-3-onboarding-feedback",
    kind: "beta-feedback",
    summary: "Beta users reached activation 30% faster with the new flow.",
    source: "Beta cohort #3",
    experimentId: "experiment.onboarding-ab-test",
    hypothesisId: null,
    relatedWork: null,
    resultingDecision: null,
    capturedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("evidence schema", () => {
  it("accepts evidence linked to an experiment", () => {
    expect(evidenceSchema.parse(baseEvidence())).toMatchObject({
      kind: "beta-feedback",
    });
  });

  it("accepts evidence linked directly to a hypothesis with no experiment", () => {
    expect(
      evidenceSchema.parse(
        baseEvidence({
          experimentId: null,
          hypothesisId: "hypothesis.faster-onboarding-increases-activation",
        }),
      ),
    ).toMatchObject({ experimentId: null });
  });

  it("accepts evidence linked directly to related work with no experiment or hypothesis", () => {
    expect(
      evidenceSchema.parse(
        baseEvidence({
          experimentId: null,
          relatedWork: "issue.onboarding-drop-off",
        }),
      ),
    ).toMatchObject({ relatedWork: "issue.onboarding-drop-off" });
  });

  it("accepts evidence linked to more than one of experiment/hypothesis/relatedWork simultaneously", () => {
    expect(
      evidenceSchema.parse(
        baseEvidence({
          hypothesisId: "hypothesis.faster-onboarding-increases-activation",
          relatedWork: "issue.onboarding-drop-off",
        }),
      ),
    ).toMatchObject({
      experimentId: "experiment.onboarding-ab-test",
      hypothesisId: "hypothesis.faster-onboarding-increases-activation",
      relatedWork: "issue.onboarding-drop-off",
    });
  });

  it("rejects evidence with no experiment, hypothesis, or related work", () => {
    expect(() =>
      evidenceSchema.parse(
        baseEvidence({
          experimentId: null,
          hypothesisId: null,
          relatedWork: null,
        }),
      ),
    ).toThrow();
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      evidenceSchema.parse(baseEvidence({ kind: "rumor" })),
    ).toThrow();
  });
});
