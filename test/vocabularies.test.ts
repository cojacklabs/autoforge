import { describe, expect, it } from "vitest";

import {
  INTENT_TO_WORKFLOW_KINDS,
  READINESS_WORK_KINDS,
  WORKFLOW_KINDS,
  normalizeWorkflowKind,
} from "../src/core/vocabularies.js";

describe("shared command vocabularies", () => {
  it("maps every intent work kind to canonical workflow kinds", () => {
    expect(Object.keys(INTENT_TO_WORKFLOW_KINDS).sort()).toEqual(
      [...READINESS_WORK_KINDS].sort(),
    );
    for (const kinds of Object.values(INTENT_TO_WORKFLOW_KINDS)) {
      expect(kinds.length).toBeGreaterThan(0);
      for (const kind of kinds) expect(WORKFLOW_KINDS).toContain(kind);
    }
  });

  it("normalizes every intent work kind to an accepted workflow kind", () => {
    for (const kind of READINESS_WORK_KINDS) {
      expect(WORKFLOW_KINDS).toContain(normalizeWorkflowKind(kind));
    }
  });

  it("includes data and security work kinds with dedicated workflow kinds", () => {
    expect(READINESS_WORK_KINDS).toContain("data");
    expect(READINESS_WORK_KINDS).toContain("security");
    expect(WORKFLOW_KINDS).toContain("data-change");
    expect(WORKFLOW_KINDS).toContain("security-change");
    expect(normalizeWorkflowKind("data")).toBe("data-change");
    expect(normalizeWorkflowKind("security")).toBe("security-change");
  });
});
