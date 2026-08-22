import type { TraceLink } from "./schemas.js";

export type TraceDirection = "forward" | "reverse" | "both";

export interface ImpactPath {
  artifactId: string;
  depth: number;
  links: TraceLink[];
}

export interface ImpactOptions {
  direction?: TraceDirection;
  maxDepth?: number;
  relationship?: string;
}

export function traceImpact(
  links: readonly TraceLink[],
  sourceId: string,
  options: ImpactOptions = {},
): ImpactPath[] {
  const direction = options.direction ?? "both";
  const maxDepth = options.maxDepth ?? 3;
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 20) {
    throw new Error("maxDepth must be an integer between 1 and 20");
  }
  const candidates = links.filter(
    (link) =>
      options.relationship === undefined ||
      link.relationship === options.relationship,
  );
  const results: ImpactPath[] = [];
  const queue: ImpactPath[] = [{ artifactId: sourceId, depth: 0, links: [] }];
  const seen = new Set([sourceId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;
    const next = candidates.flatMap((link) => {
      const targets: Array<{ id: string; link: TraceLink }> = [];
      if (
        (direction === "forward" || direction === "both") &&
        link.sourceId === current.artifactId
      ) {
        targets.push({ id: link.targetId, link });
      }
      if (
        (direction === "reverse" || direction === "both") &&
        link.targetId === current.artifactId
      ) {
        targets.push({ id: link.sourceId, link });
      }
      return targets;
    });
    for (const { id, link } of next.sort((left, right) =>
      left.id.localeCompare(right.id),
    )) {
      if (seen.has(id)) continue;
      seen.add(id);
      const path = {
        artifactId: id,
        depth: current.depth + 1,
        links: [...current.links, link],
      };
      results.push(path);
      queue.push(path);
    }
  }
  return results.sort(
    (left, right) =>
      left.depth - right.depth ||
      left.artifactId.localeCompare(right.artifactId),
  );
}
