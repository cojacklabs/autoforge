import { describe, expect, it } from "vitest";
import {
  strategyAssessmentSchema,
  strategyMemorySchema,
} from "../src/strategy/strategy-schemas.js";

const TIMESTAMP = "2026-08-23T00:00:00.000Z";

function validAssessment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "strategy.recruiter-messaging",
    workId: "feature.recruiter-messaging",
    factors: {
      alignment: "low",
      value: "uncertain",
      risk: "high",
      cost: "medium",
      evidenceStrength: "low",
      dependencyPressure: "low",
      complexity: "medium",
      releaseConstraint: "low",
    },
    decision: "backlog",
    rationale: "High spam risk, low alignment, thin evidence.",
    evidenceIds: [],
    resultingDecision: null,
    supersedes: null,
    status: "active",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("strategy assessment schema", () => {
  it("accepts a complete, valid assessment", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment()),
    ).not.toThrow();
  });

  it("rejects an unknown factor level", () => {
    expect(() =>
      strategyAssessmentSchema.parse(
        validAssessment({
          factors: {
            alignment: "extreme",
            value: "uncertain",
            risk: "high",
            cost: "medium",
            evidenceStrength: "low",
            dependencyPressure: "low",
            complexity: "medium",
            releaseConstraint: "low",
          },
        }),
      ),
    ).toThrow();
  });

  it("rejects an unknown decision label", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment({ decision: "urgent" })),
    ).toThrow();
  });

  it("rejects an empty rationale", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment({ rationale: "" })),
    ).toThrow();
  });

  it("rejects a malformed id", () => {
    expect(() =>
      strategyAssessmentSchema.parse(
        validAssessment({ id: "not-a-strategy-id" }),
      ),
    ).toThrow();
  });

  it("rejects a workId that is not a feature/phase/task/issue reference", () => {
    expect(() =>
      strategyAssessmentSchema.parse(validAssessment({ workId: "sprint.7" })),
    ).toThrow();
  });
});

describe("strategy memory schema", () => {
  it("rejects duplicate assessment IDs", () => {
    const assessment = validAssessment();
    expect(() =>
      strategyMemorySchema.parse({ assessments: [assessment, assessment] }),
    ).toThrow();
  });

  it("accepts an empty memory", () => {
    expect(() => strategyMemorySchema.parse({ assessments: [] })).not.toThrow();
  });
});
