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

export interface EvidenceScope {
  revision?: { sha: string; dirty: boolean };
  environment?: { platform: string; nodeMajor: number; ci: boolean };
  gateDefinitionFingerprint?: string;
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
  outOfScopeCount: number;
  outOfScopeReasons: string[];
}

export interface EvaluateReadinessOptions {
  workId?: string;
  currentScope?: EvidenceScope;
}

function compareEvidence(
  left: ValidationEvidence,
  right: ValidationEvidence,
): number {
  return (
    Date.parse(left.capturedAt) - Date.parse(right.capturedAt) ||
    left.id.localeCompare(right.id)
  );
}

function isConclusive(evidence: ValidationEvidence): boolean {
  return evidence.status === "passed" || evidence.status === "failed";
}

function scopeMismatchReason(
  evidence: ValidationEvidence,
  currentScope: EvidenceScope,
): string | undefined {
  if (
    evidence.revision &&
    currentScope.revision &&
    evidence.revision.sha !== currentScope.revision.sha
  ) {
    return "different revision";
  }
  if (evidence.environment && currentScope.environment) {
    const { platform, nodeMajor, ci } = evidence.environment;
    const current = currentScope.environment;
    if (
      platform !== current.platform ||
      nodeMajor !== current.nodeMajor ||
      ci !== current.ci
    ) {
      return "different environment";
    }
  }
  if (
    evidence.gateDefinitionFingerprint &&
    currentScope.gateDefinitionFingerprint &&
    evidence.gateDefinitionFingerprint !==
      currentScope.gateDefinitionFingerprint
  ) {
    return "different gate definition";
  }
  return undefined;
}

export function scopeMatches(
  evidence: ValidationEvidence,
  currentScope: EvidenceScope | undefined,
): boolean {
  if (!currentScope) return true;
  return scopeMismatchReason(evidence, currentScope) === undefined;
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
  const instantDifference =
    Date.parse(evidence.capturedAt) - Date.parse(authority.capturedAt);
  return (
    instantDifference > 0 ||
    (instantDifference === 0 &&
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
  const inScope: ValidationEvidence[] = [];
  const outOfScopeReasons: string[] = [];
  for (const item of requiredEvidence) {
    const reason = options.currentScope
      ? scopeMismatchReason(item, options.currentScope)
      : undefined;
    if (reason) {
      outOfScopeReasons.push(`${item.id}: ${reason}`);
    } else {
      inScope.push(item);
    }
  }
  outOfScopeReasons.sort((left, right) => left.localeCompare(right));
  const authoritativeEvidence = (
    options.workId
      ? projectAuthorities(
          inScope.filter(
            (item) =>
              item.workId === undefined || item.workId === options.workId,
          ),
        )
      : projectAuthorities(inScope)
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
    outOfScopeCount: outOfScopeReasons.length,
    outOfScopeReasons,
  };
}
