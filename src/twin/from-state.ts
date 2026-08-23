import type { DecisionMemory } from "../decisions/schemas.js";
import type { DomainArtifact } from "../domain/schemas.js";
import { selectApplicableRules } from "../governance/evaluate.js";
import type { ConstitutionArtifact } from "../governance/schemas.js";
import type { EvidenceMemory } from "../learning/evidence-schemas.js";
import type { ExperimentMemory } from "../learning/experiment-schemas.js";
import type { HypothesisMemory } from "../learning/hypothesis-schemas.js";
import type { ValidationEvidenceState } from "../quality/evidence.js";
import type {
  Specification,
  SpecificationType,
} from "../specifications/schemas.js";
import type { StrategyMemory } from "../strategy/strategy-schemas.js";
import type { TraceGraph } from "../traceability/schemas.js";
import type { WorkState } from "../work/schemas.js";
import { buildTwinProjection } from "./projection.js";
import type { TwinProjection } from "./schemas.js";
import { twinNodeTypeSchema } from "./schemas.js";

export interface TwinStateInput {
  projectId: string;
  generatedAt: string;
  work: WorkState;
  decisions: DecisionMemory;
  hypotheses: HypothesisMemory;
  experiments: ExperimentMemory;
  evidence: EvidenceMemory;
  constitution?: ConstitutionArtifact | null;
  domain?: DomainArtifact | null;
  specifications?: readonly Specification[];
  strategy?: StrategyMemory;
  traceability?: TraceGraph;
  validationEvidence?: ValidationEvidenceState;
}

export function projectStateToTwin(input: TwinStateInput): TwinProjection {
  const allWorkKinds: Record<string, string> = {
    ...Object.fromEntries(
      input.work.features.map((item) => [item.id, "feature"]),
    ),
    ...Object.fromEntries(input.work.phases.map((item) => [item.id, "phase"])),
    ...Object.fromEntries(input.work.tasks.map((item) => [item.id, "task"])),
    ...Object.fromEntries(input.work.issues.map((item) => [item.id, "issue"])),
  };

  const constitutionNodes = (input.constitution?.rules ?? []).map((rule) => ({
    id: rule.id,
    type: "constitution" as const,
    title: rule.title,
    source: ".autoforge/governance/constitution.json",
    updatedAt: input.constitution!.updatedAt,
  }));
  const constitutionEdges = (input.constitution?.rules ?? []).flatMap((rule) =>
    Object.entries(allWorkKinds)
      .filter(([, kind]) =>
        selectApplicableRules(input.constitution!, {
          objective: "",
          workKind: kind,
        }).some((applicable) => applicable.id === rule.id),
      )
      .map(([workId]) => ({
        sourceId: rule.id,
        targetId: workId,
        relationship: "governs",
      })),
  );

  const domainNodes = (input.domain?.concepts ?? []).map((concept) => ({
    id: concept.id,
    type: "domain" as const,
    title: concept.name,
    source: ".autoforge/domain/artifact.json",
    updatedAt: input.domain!.updatedAt,
  }));
  const domainRelationshipEdges = (input.domain?.relationships ?? []).map(
    (relationship) => ({
      sourceId: relationship.sourceId,
      targetId: relationship.targetId,
      relationship: relationship.type,
    }),
  );
  const domainProvenanceEdges = (input.domain?.concepts ?? []).flatMap(
    (concept) =>
      concept.provenance
        .filter(
          (entry) =>
            entry.sourceType === "decision" ||
            entry.sourceType === "specification",
        )
        .map((entry) => ({
          sourceId: concept.id,
          targetId: entry.sourceId,
          relationship: "models",
        })),
  );

  const specificationNodes = (input.specifications ?? []).map((spec) => ({
    id: spec.id,
    type: specificationNodeType(spec.type),
    title: spec.name,
    source: spec.source,
    updatedAt: spec.updatedAt,
  }));
  const specificationEdges = (input.specifications ?? []).flatMap((spec) =>
    Object.entries(spec.relationships).flatMap(([relationshipName, targets]) =>
      targets.map((targetId) => ({
        sourceId: spec.id,
        targetId,
        relationship: relationshipName,
      })),
    ),
  );

  const activeStrategyAssessments = (input.strategy?.assessments ?? []).filter(
    (assessment) => assessment.status === "active",
  );
  const strategyNodes = activeStrategyAssessments.map((assessment) => ({
    id: assessment.id,
    type: "strategy" as const,
    title: `${assessment.decision}: ${assessment.workId}`,
    source: ".autoforge/learning/strategy.json",
    updatedAt: assessment.updatedAt,
  }));
  const strategyEdges = activeStrategyAssessments.flatMap((assessment) => [
    {
      sourceId: assessment.id,
      targetId: assessment.workId,
      relationship: "assesses",
    },
    ...(assessment.resultingDecision
      ? [
          {
            sourceId: assessment.id,
            targetId: assessment.resultingDecision,
            relationship: "resulted-in",
          },
        ]
      : []),
  ]);

  const traceabilityEdges = (input.traceability?.links ?? []).map((link) => ({
    sourceId: link.sourceId,
    targetId: link.targetId,
    relationship: link.relationship,
  }));

  const validationEvidenceNodes = (
    input.validationEvidence?.evidence ?? []
  ).map((record) => ({
    id: record.id,
    type: "validation-evidence" as const,
    title: `${record.gateId} (${record.status})`,
    source: ".autoforge/quality/evidence.json",
    updatedAt: record.capturedAt,
  }));
  const validationEvidenceEdges = (
    input.validationEvidence?.evidence ?? []
  ).flatMap((record) => [
    ...(record.workId
      ? [
          {
            sourceId: record.id,
            targetId: record.workId,
            relationship: "validates",
          },
        ]
      : []),
    ...record.traceIds.map((traceId) => ({
      sourceId: record.id,
      targetId: traceId,
      relationship: "traces",
    })),
  ]);

  const nodes = [
    ...constitutionNodes,
    ...domainNodes,
    ...specificationNodes,
    ...strategyNodes,
    ...validationEvidenceNodes,
    ...input.work.features.map((item) => workNode(item, "feature")),
    ...input.work.phases.map((item) => workNode(item, "phase")),
    ...input.work.tasks.map((item) => workNode(item, "task")),
    ...input.work.issues.map((item) => workNode(item, "issue")),
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
    ...constitutionEdges,
    ...domainRelationshipEdges,
    ...domainProvenanceEdges,
    ...specificationEdges,
    ...strategyEdges,
    ...traceabilityEdges,
    ...validationEvidenceEdges,
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

const SPECIFICATION_TYPE_TO_TWIN_NODE_TYPE: Record<
  SpecificationType,
  (typeof twinNodeTypeSchema.options)[number]
> = {
  architecture: "architecture",
  screen: "screen",
  component: "component",
  flow: "flow",
  api: "api",
  domain: "domain",
  design: "specification",
  token: "specification",
  state: "specification",
  responsive: "specification",
  product: "specification",
  research: "specification",
  intent: "specification",
};

function specificationNodeType(
  type: SpecificationType,
): (typeof twinNodeTypeSchema.options)[number] {
  return SPECIFICATION_TYPE_TO_TWIN_NODE_TYPE[type];
}

function workNode(
  item: Pick<
    WorkState["features"][number],
    "id" | "name" | "status" | "updatedAt"
  >,
  type: "feature" | "phase" | "task" | "issue",
) {
  return {
    id: item.id,
    type,
    title: `${item.name} (${item.status})`,
    source: ".autoforge/state/work.json",
    updatedAt: item.updatedAt,
  };
}
