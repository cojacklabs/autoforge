import type { ValidationEvidence } from "./evidence.js";

export interface AuthoritativeEvidence {
  evidenceId: string;
  gateId: string;
  status: ValidationEvidence["status"];
  workId: string | null;
  reason: string;
  capturedAt: string;
  supersedes: string[];
}

export interface ReadinessReport {
  ready: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  effectiveTotal: number;
  effectivePassed: number;
  effectiveFailed: number;
  effectiveSkipped: number;
  blockers: string[];
  authoritativeEvidence: AuthoritativeEvidence[];
}

export interface EvaluateReadinessOptions {
  workId?: string;
}

function compareEvidence(
  left: ValidationEvidence,
  right: ValidationEvidence,
): number {
  return (
    left.capturedAt.localeCompare(right.capturedAt) ||
    left.id.localeCompare(right.id)
  );
}

function isConclusive(evidence: ValidationEvidence): boolean {
  return evidence.status === "passed" || evidence.status === "failed";
}

function selectAuthority(
  evidence: readonly ValidationEvidence[],
): AuthoritativeEvidence | undefined {
  const ordered = [...evidence].sort(compareEvidence);
  const conclusive = ordered.filter(isConclusive);
  const selected = conclusive.at(-1) ?? ordered.at(-1);
  if (!selected) return undefined;
  return {
    evidenceId: selected.id,
    gateId: selected.gateId,
    status: selected.status,
    workId: selected.workId ?? null,
    reason: selected.reason,
    capturedAt: selected.capturedAt,
    supersedes: conclusive
      .filter((candidate) => candidate.id !== selected.id)
      .map((candidate) => candidate.id),
  };
}

function isAfterAuthority(
  evidence: ValidationEvidence,
  authority: AuthoritativeEvidence,
): boolean {
  return (
    evidence.capturedAt.localeCompare(authority.capturedAt) > 0 ||
    (evidence.capturedAt === authority.capturedAt &&
      evidence.id.localeCompare(authority.evidenceId) > 0)
  );
}

function groupByGate(
  evidence: readonly ValidationEvidence[],
): Map<string, ValidationEvidence[]> {
  const grouped = new Map<string, ValidationEvidence[]>();
  for (const item of evidence) {
    const current = grouped.get(item.gateId) ?? [];
    current.push(item);
    grouped.set(item.gateId, current);
  }
  return grouped;
}

function projectAuthorities(
  evidence: readonly ValidationEvidence[],
): AuthoritativeEvidence[] {
  const authorities: AuthoritativeEvidence[] = [];
  for (const gateEvidence of groupByGate(evidence).values()) {
    const projectEvidence = gateEvidence.filter(
      (item) => item.workId === undefined,
    );
    const projectAuthority = selectAuthority(projectEvidence);
    const projectBaseline =
      projectAuthority?.status === "skipped" ? undefined : projectAuthority;
    if (projectAuthority) {
      const additionallySuperseded = projectBaseline
        ? gateEvidence
            .filter(
              (item) =>
                item.workId !== undefined &&
                isConclusive(item) &&
                !isAfterAuthority(item, projectBaseline),
            )
            .map((item) => item.id)
        : [];
      authorities.push({
        ...projectAuthority,
        supersedes: [
          ...new Set([
            ...projectAuthority.supersedes,
            ...additionallySuperseded,
          ]),
        ].sort(),
      });
    }

    const byWork = new Map<string, ValidationEvidence[]>();
    for (const item of gateEvidence) {
      if (!item.workId) continue;
      if (projectBaseline && !isAfterAuthority(item, projectBaseline)) {
        continue;
      }
      const current = byWork.get(item.workId) ?? [];
      current.push(item);
      byWork.set(item.workId, current);
    }
    for (const workEvidence of byWork.values()) {
      const authority = selectAuthority(workEvidence);
      if (authority) authorities.push(authority);
    }
  }
  return authorities;
}

export function evaluateReadiness(
  evidence: readonly ValidationEvidence[],
  options: EvaluateReadinessOptions = {},
): ReadinessReport {
  const requiredEvidence = evidence.filter(
    (item) => item.severity === "required",
  );
  const authoritativeEvidence = (
    options.workId
      ? projectAuthorities(
          requiredEvidence.filter(
            (item) =>
              item.workId === undefined || item.workId === options.workId,
          ),
        )
      : projectAuthorities(requiredEvidence)
  ).sort(
    (left, right) =>
      left.gateId.localeCompare(right.gateId) ||
      (left.workId ?? "").localeCompare(right.workId ?? "") ||
      left.evidenceId.localeCompare(right.evidenceId),
  );
  const failedAuthorities = authoritativeEvidence.filter(
    (item) => item.status === "failed",
  );
  const blockers = failedAuthorities
    .map(
      (item) =>
        `${item.gateId}${item.workId ? ` [${item.workId}]` : ""}: ${item.reason}`,
    )
    .sort((left, right) => left.localeCompare(right));
  const failed = evidence.filter((item) => item.status === "failed");
  return {
    ready: blockers.length === 0,
    total: evidence.length,
    passed: evidence.filter((item) => item.status === "passed").length,
    failed: failed.length,
    skipped: evidence.filter((item) => item.status === "skipped").length,
    effectiveTotal: authoritativeEvidence.length,
    effectivePassed: authoritativeEvidence.filter(
      (item) => item.status === "passed",
    ).length,
    effectiveFailed: failedAuthorities.length,
    effectiveSkipped: authoritativeEvidence.filter(
      (item) => item.status === "skipped",
    ).length,
    blockers,
    authoritativeEvidence,
  };
}
