import { describe, expect, it } from "vitest";
import {
  evaluateGovernance,
  selectApplicableRules,
} from "../src/governance/evaluate.js";
import type { ConstitutionArtifact } from "../src/governance/schemas.js";

const constitution: ConstitutionArtifact = {
  id: "constitution.product.release-scope",
  name: "Release scope",
  purpose: "Protect approved boundaries.",
  rules: [
    {
      id: "constitution.release.no-billing",
      title: "Billing is out of scope",
      statement: "Billing MUST NOT be implemented in Release A.",
      level: "MUST_NOT",
      enforcement: "hard",
      scope: {
        paths: [],
        workKinds: ["implementation"],
        releases: ["A"],
        tags: [],
      },
      rationale: "Validate discovery first.",
      nonGoals: ["subscription checkout"],
    },
  ],
  source: "human-approved",
  updatedAt: "2026-08-21T00:00:00.000Z",
};

describe("governance evaluation", () => {
  it("selects rules by work scope", () => {
    expect(
      selectApplicableRules(constitution, {
        objective: "Implement billing",
        workKind: "implementation",
        release: "A",
      }),
    ).toHaveLength(1);
    expect(
      selectApplicableRules(constitution, {
        objective: "Implement billing",
        workKind: "research",
        release: "A",
      }),
    ).toHaveLength(0);
  });

  it("blocks a hard conflict with an explanation", () => {
    expect(
      evaluateGovernance(constitution, {
        objective: "Implement subscription checkout",
        workKind: "implementation",
        release: "A",
      }),
    ).toMatchObject([
      { status: "blocked", ruleId: "constitution.release.no-billing" },
    ]);
  });
});
