import type { DecisionMemory } from "../decisions/schemas.js";
import type { WorkState } from "../work/schemas.js";
import { buildTwinProjection } from "./projection.js";
import type { TwinProjection } from "./schemas.js";

export interface TwinStateInput {
  projectId: string;
  generatedAt: string;
  work: WorkState;
  decisions: DecisionMemory;
}

export function projectStateToTwin(input: TwinStateInput): TwinProjection {
  const nodes = [
    ...input.work.features.map((item) => workNode(item, "feature")),
    ...input.work.phases.map((item) => workNode(item, "flow")),
    ...input.work.tasks.map((item) => workNode(item, "work")),
    ...input.work.issues.map((item) => workNode(item, "risk")),
    ...input.decisions.decisions.map((decision) => ({
      id: decision.id,
      type: "decision" as const,
      title: decision.statement,
      source: ".autoforge/state/decisions.json",
      updatedAt: decision.updatedAt,
    })),
  ];
  const edges = [
    ...input.work.phases.map((phase) => ({
      sourceId: phase.id,
      targetId: phase.featureId,
      relationship: "part-of",
    })),
    ...input.work.tasks.map((task) => ({
      sourceId: task.id,
      targetId: task.phaseId,
      relationship: "part-of",
    })),
    ...input.decisions.decisions.flatMap((decision) => [
      ...decision.relatedWork.map((workId) => ({
        sourceId: decision.id,
        targetId: workId,
        relationship: "informs",
      })),
      ...(decision.supersedes
        ? [
            {
              sourceId: decision.id,
              targetId: decision.supersedes,
              relationship: "supersedes",
            },
          ]
        : []),
    ]),
  ];

  return buildTwinProjection({
    projectId: input.projectId,
    generatedAt: input.generatedAt,
    nodes,
    edges,
  });
}

function workNode(
  item: Pick<
    WorkState["features"][number],
    "id" | "name" | "status" | "updatedAt"
  >,
  type: "feature" | "flow" | "work" | "risk",
) {
  return {
    id: item.id,
    type,
    title: `${item.name} (${item.status})`,
    source: ".autoforge/state/work.json",
    updatedAt: item.updatedAt,
  };
}
