import type { ValidationEvidence } from "./evidence.js";

export interface ReadinessReport {
  ready: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  blockers: string[];
}

export function evaluateReadiness(
  evidence: readonly ValidationEvidence[],
): ReadinessReport {
  const failed = evidence.filter((item) => item.status === "failed");
  const blockers = failed
    .filter((item) => item.severity === "required")
    .map((item) => `${item.gateId}: ${item.reason}`)
    .sort((left, right) => left.localeCompare(right));
  return {
    ready: blockers.length === 0,
    total: evidence.length,
    passed: evidence.filter((item) => item.status === "passed").length,
    failed: failed.length,
    skipped: evidence.filter((item) => item.status === "skipped").length,
    blockers,
  };
}
