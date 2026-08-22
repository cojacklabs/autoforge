import {
  twinEdgeSchema,
  twinNodeSchema,
  twinProjectionSchema,
  type TwinEdge,
  type TwinNode,
  type TwinProjection,
} from "./schemas.js";

export interface TwinProjectionInput {
  projectId: string;
  generatedAt: string;
  nodes: TwinNode[];
  edges: TwinEdge[];
}

export function buildTwinProjection(
  input: TwinProjectionInput,
): TwinProjection {
  const nodes = deduplicate(
    input.nodes.map((node) => twinNodeSchema.parse(node)),
    (node) => node.id,
  ).sort((left, right) => left.id.localeCompare(right.id));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = deduplicate(
    input.edges
      .map((edge) => twinEdgeSchema.parse(edge))
      .filter(
        (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
      ),
    (edge) => `${edge.sourceId}|${edge.relationship}|${edge.targetId}`,
  ).sort((left, right) =>
    `${left.sourceId}|${left.relationship}|${left.targetId}`.localeCompare(
      `${right.sourceId}|${right.relationship}|${right.targetId}`,
    ),
  );

  return twinProjectionSchema.parse({
    schemaVersion: 1,
    projectId: input.projectId,
    generatedAt: input.generatedAt,
    nodes,
    edges,
  });
}

function deduplicate<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const itemKey = key(item);
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}
