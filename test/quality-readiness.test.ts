import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "../src/quality/readiness.js";
import type { ValidationEvidence } from "../src/quality/evidence.js";

const evidence = (
  status: ValidationEvidence["status"],
  severity: ValidationEvidence["severity"],
  gateId: string,
): ValidationEvidence => ({
  id: `evidence.${gateId}`,
  gateId,
  status,
  severity,
  traceIds: [],
  reason: `${gateId} result`,
  capturedAt: "2026-08-22T00:00:00.000Z",
});

describe("quality readiness", () => {
  it("blocks readiness on required failures only", () => {
    expect(
      evaluateReadiness([
        evidence("passed", "required", "tests"),
        evidence("failed", "advisory", "lint"),
      ]),
    ).toMatchObject({ ready: true, total: 2, failed: 1, blockers: [] });
    expect(
      evaluateReadiness([evidence("failed", "required", "tests")]),
    ).toMatchObject({ ready: false, blockers: ["tests: tests result"] });
  });
});
