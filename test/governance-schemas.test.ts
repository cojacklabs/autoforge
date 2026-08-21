import { describe, expect, it } from "vitest";
import {
  constitutionArtifactSchema,
  governanceEvaluationSchema,
  governanceRuleSchema,
} from "../src/governance/schemas.js";

const rule = {
  id: "constitution.release.no-billing",
  title: "Billing is out of scope",
  statement: "Billing MUST NOT be implemented in Release A.",
  level: "MUST_NOT" as const,
  enforcement: "hard" as const,
  scope: {
    paths: [],
    workKinds: ["implementation"],
    releases: ["A"],
    tags: [],
  },
  rationale: "Release A validates candidate discovery first.",
  nonGoals: ["Subscription checkout"],
};

describe("governance schemas", () => {
  it("validates constitution rules and artifacts", () => {
    const artifact = constitutionArtifactSchema.parse({
      id: "constitution.product.release-scope",
      name: "Release scope",
      purpose: "Protect approved release boundaries.",
      rules: [rule],
      source: "human-approved",
      updatedAt: "2026-08-21T00:00:00.000Z",
    });
    expect(artifact.rules[0]?.enforcement).toBe("hard");
  });

  it("represents explainable evaluations", () => {
    expect(
      governanceEvaluationSchema.parse({
        status: "blocked",
        ruleId: rule.id,
        reason: "The task conflicts with the approved release scope.",
      }),
    ).toMatchObject({ status: "blocked", ruleId: rule.id });
  });

  it("rejects invalid normative levels", () => {
    expect(() =>
      governanceRuleSchema.parse({ ...rule, level: "REQUIRED" }),
    ).toThrow();
  });
});
