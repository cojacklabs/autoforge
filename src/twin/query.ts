import {
  twinQuerySchema,
  twinProjectionSchema,
  type TwinProjection,
} from "./schemas.js";

export function queryTwin(
  projection: TwinProjection,
  query: Partial<import("./schemas.js").TwinQuery> = {},
): TwinProjection {
  const validatedProjection = twinProjectionSchema.parse(projection);
  const validatedQuery = twinQuerySchema.parse(query);
  const allowedTypes = validatedQuery.nodeTypes
    ? new Set(validatedQuery.nodeTypes)
    : undefined;
  const selectedNodes = validatedProjection.nodes.filter(
    (node) => !allowedTypes || allowedTypes.has(node.type),
  );
  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdges = validatedProjection.edges.filter(
    (edge) =>
      selectedIds.has(edge.sourceId) &&
      selectedIds.has(edge.targetId) &&
      (!validatedQuery.relationship ||
        edge.relationship === validatedQuery.relationship),
  );
  const reachableIds = collectReachableIds(
    selectedIds,
    selectedEdges,
    validatedQuery.maxDepth,
  );
  const nodes = selectedNodes
    .filter((node) => reachableIds.has(node.id))
    .slice(0, validatedQuery.limit);
  const nodeIds = new Set(nodes.map((node) => node.id));

  return twinProjectionSchema.parse({
    ...validatedProjection,
    nodes,
    edges: selectedEdges.filter(
      (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
    ),
  });
}

function collectReachableIds(
  nodeIds: Set<string>,
  edges: TwinProjection["edges"],
  maxDepth: number,
): Set<string> {
  if (maxDepth === 0) return nodeIds;
  const reachable = new Set(nodeIds);
  let frontier = new Set(nodeIds);
  for (let depth = 0; depth < maxDepth && frontier.size > 0; depth += 1) {
    const next = new Set<string>();
    for (const edge of edges) {
      if (frontier.has(edge.sourceId) && !reachable.has(edge.targetId)) {
        next.add(edge.targetId);
      }
      if (frontier.has(edge.targetId) && !reachable.has(edge.sourceId)) {
        next.add(edge.sourceId);
      }
    }
    for (const id of next) reachable.add(id);
    frontier = next;
  }
  return reachable;
}
