import { describe, expect, it } from "vitest";

import {
  generatePlanningArtifact,
  isPlanningArtifactFresh,
} from "../../src/planning/artifacts.js";

const intent = {
  raw: "Build checkout.",
  objective: "Allow customers to pay.",
  requirements: ["Support cards", "Record payment status"],
  assumptions: ["An account already exists."],
  unknowns: ["Which provider?"],
  constraints: ["Use the existing API."],
  acceptanceCriteria: ["Successful payments are recorded."],
};

describe("modular planning artifacts", () => {
  it("generates independently addressable feature artifacts", () => {
    const artifact = generatePlanningArtifact(
      intent,
      "feature-brief",
      new Date("2026-08-20T12:00:00.000Z"),
    );
    expect(artifact).toMatchObject({
      kind: "feature-brief",
      generatorVersion: "0.8.0-planning.1",
      generatedAt: "2026-08-20T12:00:00.000Z",
    });
    expect(artifact.content).toContain("Allow customers to pay.");
    expect(artifact.sourceFingerprint).toHaveLength(64);
  });

  it("generates specialized stories and criteria without a monolith", () => {
    expect(generatePlanningArtifact(intent, "user-stories").content).toContain(
      "As a user, I want support cards",
    );
    expect(
      generatePlanningArtifact(intent, "acceptance-criteria").content,
    ).toContain("Successful payments are recorded.");
  });

  it("detects stale artifacts when intent changes", () => {
    const artifact = generatePlanningArtifact(intent, "technical-plan");
    expect(isPlanningArtifactFresh(artifact, intent)).toBe(true);
    expect(
      isPlanningArtifactFresh(artifact, {
        ...intent,
        objective: "Refund payments.",
      }),
    ).toBe(false);
  });
});
