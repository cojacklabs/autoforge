import type { DecisionMemory } from "../decisions/schemas.js";
import type { EvidenceMemory } from "../learning/evidence-schemas.js";
import type { ExperimentMemory } from "../learning/experiment-schemas.js";
import type { HypothesisMemory } from "../learning/hypothesis-schemas.js";
import type { WorkState } from "../work/schemas.js";
import { buildTwinProjection } from "./projection.js";
import type { TwinProjection } from "./schemas.js";

export interface TwinStateInput {
  projectId: string;
  generatedAt: string;
  work: WorkState;
  decisions: DecisionMemory;
  hypotheses: HypothesisMemory;
  experiments: ExperimentMemory;
  evidence: EvidenceMemory;
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
    ...input.hypotheses.hypotheses.map((hypothesis) => ({
      id: hypothesis.id,
      type: "hypothesis" as const,
      title: hypothesis.statement,
      source: ".autoforge/learning/hypotheses.json",
      updatedAt: hypothesis.updatedAt,
    })),
    ...input.experiments.experiments.map((experiment) => ({
      id: experiment.id,
      type: "experiment" as const,
      title: `${experiment.method} (${experiment.status})`,
      source: ".autoforge/learning/experiments.json",
      updatedAt: experiment.updatedAt,
    })),
    ...input.evidence.evidence.map((record) => ({
      id: record.id,
      type: "evidence" as const,
      title: record.summary,
      source: ".autoforge/learning/evidence.json",
      updatedAt: record.capturedAt,
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
    ...input.experiments.experiments.flatMap((experiment) =>
      experiment.hypothesisIds.map((hypothesisId) => ({
        sourceId: experiment.id,
        targetId: hypothesisId,
        relationship: "tests",
      })),
    ),
    ...input.evidence.evidence.flatMap((record) => {
      const links: {
        sourceId: string;
        targetId: string;
        relationship: string;
      }[] = [];
      if (record.experimentId) {
        links.push({
          sourceId: record.id,
          targetId: record.experimentId,
          relationship: "produced-by",
        });
      }
      if (record.hypothesisId) {
        links.push({
          sourceId: record.id,
          targetId: record.hypothesisId,
          relationship: "informs",
        });
      }
      if (record.relatedWork) {
        links.push({
          sourceId: record.id,
          targetId: record.relatedWork,
          relationship: "informs",
        });
      }
      if (record.resultingDecision) {
        links.push({
          sourceId: record.id,
          targetId: record.resultingDecision,
          relationship: "resulted-in",
        });
      }
      return links;
    }),
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
