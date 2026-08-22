import type {
  DomainArtifact,
  DomainInvariant,
  DomainRelationship,
} from "./schemas.js";

export interface DomainInvariantEvaluation {
  invariantId: string;
  status: "verified" | "violated" | "unknown";
  reason: string;
}

export function traverseDomain(
  artifact: DomainArtifact,
  startId: string,
  direction: "outgoing" | "incoming" = "outgoing",
): string[] {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const relationship of artifact.relationships) {
      const matches =
        direction === "outgoing"
          ? relationship.sourceId === current
          : relationship.targetId === current;
      if (!matches || visited.has(relationship.targetId)) continue;
      const next =
        direction === "outgoing"
          ? relationship.targetId
          : relationship.sourceId;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return [...visited].sort();
}

export function evaluateDomainInvariant(
  invariant: DomainInvariant,
): DomainInvariantEvaluation {
  const evidence = invariant.evidence.find((item) =>
    /^(verified|violated):/i.test(item),
  );
  if (!evidence) {
    return {
      invariantId: invariant.id,
      status: "unknown",
      reason: "No explicit verified or violated evidence is recorded.",
    };
  }
  const status = evidence.toLowerCase().startsWith("violated:")
    ? "violated"
    : "verified";
  return {
    invariantId: invariant.id,
    status,
    reason:
      evidence.slice(evidence.indexOf(":") + 1).trim() || "Evidence recorded.",
  };
}

export function evaluateDomainInvariants(
  invariants: DomainInvariant[],
): DomainInvariantEvaluation[] {
  return invariants.map(evaluateDomainInvariant);
}

export function relationshipTargets(
  artifact: DomainArtifact,
  relationship: DomainRelationship,
): string[] {
  return traverseDomain(artifact, relationship.sourceId);
}
