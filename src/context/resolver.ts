import type { AutoForgeConfig } from "../core/config.js";
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { searchDecisions } from "../decisions/search.js";
import type { DecisionMemory } from "../decisions/schemas.js";
import type { DoctrineSessionState } from "../doctrine/session.js";
import type { DoctrineRegistry } from "../doctrine/schemas.js";
import type { SpecificationRegistry } from "../specifications/registry.js";
import type {
  Specification,
  SpecificationRelationshipEdge,
} from "../specifications/schemas.js";
import type { WorkState } from "../work/schemas.js";
import {
  CharacterTokenEstimator,
  type ContextTokenEstimator,
} from "./estimator.js";
import {
  contextSelectionSchema,
  type ContextExclusion,
  type ContextSelection,
  type ContextWork,
  type DecisionRef,
  type DoctrineRef,
  type SpecificationRef,
} from "./schemas.js";

const SPECIFICATION_FIELD_WEIGHTS = {
  id: 24,
  name: 20,
  tags: 16,
  description: 10,
  source: 8,
  content: 2,
  design: 14,
  relationship: 12,
} as const;

const MAX_RELATIONSHIP_SEEDS = 25;
const CONTEXT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

type ContextSpecificationRegistry = Pick<
  SpecificationRegistry,
  "list" | "findRelationships"
>;

export interface ResolveContextInput {
  work: WorkState;
  decisions: DecisionMemory;
  doctrines: DoctrineRegistry;
  doctrineSessions: DoctrineSessionState;
  specifications: ContextSpecificationRegistry;
  config: Pick<AutoForgeConfig, "contextBudget">;
  taskDescription?: string;
}

export interface ContextResolverOptions {
  estimator?: ContextTokenEstimator;
}

interface RankedSpecifications {
  candidates: SpecificationRef[];
  exclusions: ContextExclusion[];
}

type BudgetCandidate =
  | { kind: "doctrine"; reference: DoctrineRef }
  | { kind: "decision"; reference: DecisionRef }
  | { kind: "specification"; reference: SpecificationRef };

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._/-]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized
    ? [
        ...new Set(
          normalized
            .split(/\s+/)
            .filter((token) => !CONTEXT_STOP_WORDS.has(token)),
        ),
      ]
    : [];
}

function tokenMatches(queryToken: string, candidateToken: string): boolean {
  return (
    queryToken === candidateToken ||
    (queryToken.length >= 4 && candidateToken.startsWith(queryToken)) ||
    (candidateToken.length >= 4 && queryToken.startsWith(candidateToken))
  );
}

function matchingTokens(
  queryTokens: readonly string[],
  values: readonly string[],
): string[] {
  const candidateTokens = values.flatMap(tokenize);
  return queryTokens.filter((queryToken) =>
    candidateTokens.some((candidateToken) =>
      tokenMatches(queryToken, candidateToken),
    ),
  );
}

function estimateSpecification(
  estimator: ContextTokenEstimator,
  specification: Specification,
): number {
  return estimator.estimate(
    [
      specification.id,
      specification.type,
      specification.name,
      specification.description,
      specification.tags.join(" "),
      specification.source,
      JSON.stringify(specification.relationships),
      JSON.stringify(specification.design ?? {}),
      specification.content,
    ].join("\n"),
  );
}

function rankSpecification(
  estimator: ContextTokenEstimator,
  specification: Specification,
  queryTokens: readonly string[],
): SpecificationRef | undefined {
  const fields: ReadonlyArray<
    readonly [
      Exclude<keyof typeof SPECIFICATION_FIELD_WEIGHTS, "relationship">,
      readonly string[],
    ]
  > = [
    ["id", [specification.id]],
    ["name", [specification.name]],
    ["tags", specification.tags],
    ["description", [specification.description]],
    ["source", [specification.source]],
    ["design", [JSON.stringify(specification.design ?? {})]],
    ["content", [specification.content]],
  ];
  const reasons: string[] = [];
  let score = 0;
  for (const [field, values] of fields) {
    const matches = matchingTokens(queryTokens, values);
    if (matches.length === 0) {
      continue;
    }
    score += matches.length * SPECIFICATION_FIELD_WEIGHTS[field];
    reasons.push(`${field}: ${matches.join(", ")}`);
  }
  if (score === 0) {
    return undefined;
  }
  return {
    specification,
    score,
    reasons,
    estimatedTokens: estimateSpecification(estimator, specification),
  };
}

function relationshipKey(edge: SpecificationRelationshipEdge): string {
  return `${edge.sourceId}\u0000${edge.relationship}\u0000${edge.targetId}`;
}

function exclusionKey(exclusion: ContextExclusion): string {
  return `${exclusion.kind}\u0000${exclusion.id}\u0000${exclusion.reason}`;
}

async function rankSpecifications(
  registry: ContextSpecificationRegistry,
  objective: string,
  scopePaths: readonly string[],
  estimator: ContextTokenEstimator,
): Promise<RankedSpecifications> {
  const specifications = await registry.list();
  const byId = new Map(
    specifications.map((specification) => [specification.id, specification]),
  );
  const queryTokens = tokenize([objective, ...scopePaths].join("\n"));
  const candidates = new Map<string, SpecificationRef>();
  for (const specification of specifications) {
    const candidate = rankSpecification(estimator, specification, queryTokens);
    if (candidate) {
      candidates.set(specification.id, candidate);
    }
  }

  const directSeeds = [...candidates.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.specification.id.localeCompare(right.specification.id),
    )
    .slice(0, MAX_RELATIONSHIP_SEEDS);
  const seenEdges = new Set<string>();
  const exclusions = new Map<string, ContextExclusion>();
  for (const seed of directSeeds) {
    const edges = await registry.findRelationships(seed.specification.id, {
      direction: "both",
    });
    for (const edge of edges) {
      const edgeKey = relationshipKey(edge);
      if (seenEdges.has(edgeKey)) {
        continue;
      }
      seenEdges.add(edgeKey);
      const relatedId =
        edge.sourceId === seed.specification.id ? edge.targetId : edge.sourceId;
      const related = byId.get(relatedId);
      const detail = `${edge.sourceId} --${edge.relationship}--> ${edge.targetId}`;
      if (!related) {
        const exclusion: ContextExclusion = {
          kind: "specification",
          id: relatedId,
          reason: "unresolved-reference",
          details: [detail],
        };
        exclusions.set(exclusionKey(exclusion), exclusion);
        continue;
      }

      const existing = candidates.get(related.id);
      if (existing) {
        existing.score += SPECIFICATION_FIELD_WEIGHTS.relationship;
        existing.reasons.push(`relationship: ${detail}`);
      } else {
        candidates.set(related.id, {
          specification: related,
          score: SPECIFICATION_FIELD_WEIGHTS.relationship,
          reasons: [`relationship: ${detail}`],
          estimatedTokens: estimateSpecification(estimator, related),
        });
      }
    }
  }

  for (const specification of specifications) {
    if (!candidates.has(specification.id)) {
      const exclusion: ContextExclusion = {
        kind: "specification",
        id: specification.id,
        reason: "not-relevant",
        details: ["No task, scope, or one-hop relationship signal matched"],
        estimatedTokens: estimateSpecification(estimator, specification),
      };
      exclusions.set(exclusionKey(exclusion), exclusion);
    }
  }

  return {
    candidates: [...candidates.values()].sort(
      (left, right) =>
        right.score - left.score ||
        left.specification.id.localeCompare(right.specification.id),
    ),
    exclusions: [...exclusions.values()],
  };
}

function resolveWork(
  state: WorkState,
  taskDescription: string | undefined,
  estimator: ContextTokenEstimator,
): ContextWork {
  if (state.activeWork === null) {
    throw new AutoForgeError(
      "STATE_CONFLICT",
      "Context resolution requires active work",
      { exitCode: EXIT_CODE.conflict },
    );
  }
  const supplement = taskDescription?.trim();
  if (supplement !== undefined && supplement.length > 10_000) {
    throw new AutoForgeError(
      "INVALID_ARGUMENT",
      "Task description must not exceed 10,000 characters",
      { exitCode: EXIT_CODE.usage },
    );
  }
  if (state.activeWork.kind === "issue") {
    const item = state.issues.find(({ id }) => id === state.activeWork?.id);
    if (!item || item.status !== "active") {
      throw new AutoForgeError(
        "INVALID_STATE",
        `Active work cannot be resolved: ${state.activeWork.id}`,
        { exitCode: EXIT_CODE.invalidState },
      );
    }
    const objective = [item.name, item.description, supplement]
      .filter((value): value is string => Boolean(value))
      .join("\n");
    return {
      kind: "issue",
      item,
      startedAt: state.activeWork.startedAt,
      objective,
      reasons: [`active-work: ${item.id}`],
      estimatedTokens: estimator.estimate(
        [objective, ...item.scope.include, ...item.scope.exclude].join("\n"),
      ),
    };
  }

  const item = state.tasks.find(({ id }) => id === state.activeWork?.id);
  if (!item || item.status !== "active") {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Active work cannot be resolved: ${state.activeWork.id}`,
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  const objective = [item.name, item.description, supplement]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const phase = state.phases.find(({ id }) => id === item.phaseId);
  const feature = phase
    ? state.features.find(({ id }) => id === phase.featureId)
    : undefined;
  if (!phase || !feature) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Active task hierarchy cannot be resolved: ${item.id}`,
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  return {
    kind: "task",
    item,
    phase,
    feature,
    startedAt: state.activeWork.startedAt,
    objective,
    reasons: [`active-work: ${item.id}`],
    estimatedTokens: estimator.estimate(
      [
        feature.name,
        feature.description,
        phase.name,
        phase.description,
        objective,
        ...item.scope.include,
        ...item.scope.exclude,
      ].join("\n"),
    ),
  };
}

function doctrineCandidates(
  work: ContextWork,
  registry: DoctrineRegistry,
  sessions: DoctrineSessionState,
  estimator: ContextTokenEstimator,
): { candidates: DoctrineRef[]; exclusions: ContextExclusion[] } {
  const current = sessions.current;
  if (
    current === null ||
    current.workKind !== work.kind ||
    current.workId !== work.item.id
  ) {
    throw new AutoForgeError(
      "INVALID_STATE",
      "Active work does not have a matching doctrine session",
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  const selectedIds = new Set(
    current.selections.map((selection) => selection.doctrineId),
  );
  const byId = new Map(
    registry.doctrines.map((doctrine) => [doctrine.id, doctrine]),
  );
  const exclusions: ContextExclusion[] = [];
  const candidates: DoctrineRef[] = [];
  for (const selection of current.selections) {
    const doctrine = byId.get(selection.doctrineId);
    if (!doctrine) {
      throw new AutoForgeError(
        "INVALID_STATE",
        `Selected doctrine is missing: ${selection.doctrineId}`,
        { exitCode: EXIT_CODE.invalidState },
      );
    }
    const estimatedTokens = estimator.estimate(
      [doctrine.title, doctrine.summary, doctrine.content].join("\n"),
    );
    if (doctrine.status === "disabled") {
      exclusions.push({
        kind: "doctrine",
        id: doctrine.id,
        reason: "inactive",
        details: ["The doctrine was disabled after session selection"],
        estimatedTokens,
      });
      continue;
    }
    candidates.push({
      doctrine,
      score: selection.score,
      reasons: selection.reasons.map(
        (reason) => `${reason.signal}: ${reason.value} (+${reason.weight})`,
      ),
      estimatedTokens,
    });
  }
  for (const doctrine of registry.doctrines) {
    if (selectedIds.has(doctrine.id)) {
      continue;
    }
    exclusions.push({
      kind: "doctrine",
      id: doctrine.id,
      reason: doctrine.status === "disabled" ? "inactive" : "not-relevant",
      details: [
        doctrine.status === "disabled"
          ? "Doctrine is disabled"
          : "Doctrine router did not select this doctrine for the session",
      ],
      estimatedTokens: estimator.estimate(
        [doctrine.title, doctrine.summary, doctrine.content].join("\n"),
      ),
    });
  }
  return { candidates, exclusions };
}

function decisionCandidates(
  work: ContextWork,
  memory: DecisionMemory,
  estimator: ContextTokenEstimator,
): { candidates: DecisionRef[]; exclusions: ContextExclusion[] } {
  const relatedWork =
    work.kind === "task"
      ? [work.item.id, work.phase.id, work.feature.id]
      : [work.item.id];
  const matches =
    memory.decisions.length === 0
      ? []
      : searchDecisions(memory, {
          query: tokenize(work.objective).join(" "),
          relatedWork,
          limit: memory.decisions.length,
        });
  const candidates = matches.map(({ decision, score, reasons }) => ({
    decision,
    score,
    reasons,
    estimatedTokens: estimator.estimate(
      [
        decision.statement,
        decision.reasoning,
        ...decision.consequences,
        ...decision.scope,
        ...decision.keywords,
      ].join("\n"),
    ),
  }));
  const matchedIds = new Set(matches.map(({ decision }) => decision.id));
  const exclusions = memory.decisions
    .filter(({ id }) => !matchedIds.has(id))
    .map((decision): ContextExclusion => ({
      kind: "decision",
      id: decision.id,
      reason: decision.status === "active" ? "not-relevant" : "inactive",
      details: [
        decision.status === "active"
          ? "No task or work-hierarchy signal matched"
          : `Decision status is ${decision.status}`,
      ],
      estimatedTokens: estimator.estimate(
        [decision.statement, decision.reasoning, ...decision.consequences].join(
          "\n",
        ),
      ),
    }));
  return { candidates, exclusions };
}

function applyBudget(
  work: ContextWork,
  maxTokens: number,
  doctrineRefs: DoctrineRef[],
  decisionRefs: DecisionRef[],
  specificationRefs: SpecificationRef[],
  exclusions: ContextExclusion[],
): ContextSelection {
  const queues: BudgetCandidate[][] = [
    doctrineRefs.map((reference) => ({ kind: "doctrine", reference })),
    decisionRefs.map((reference) => ({ kind: "decision", reference })),
    specificationRefs.map((reference) => ({
      kind: "specification",
      reference,
    })),
  ];
  const selectedDoctrines: DoctrineRef[] = [];
  const selectedDecisions: DecisionRef[] = [];
  const selectedSpecifications: SpecificationRef[] = [];
  let usedTokens = work.estimatedTokens;
  const depth = Math.max(...queues.map((queue) => queue.length), 0);
  for (let index = 0; index < depth; index += 1) {
    for (const queue of queues) {
      const candidate = queue[index];
      if (!candidate) {
        continue;
      }
      const { estimatedTokens } = candidate.reference;
      if (usedTokens + estimatedTokens > maxTokens) {
        const source =
          candidate.kind === "doctrine"
            ? candidate.reference.doctrine
            : candidate.kind === "decision"
              ? candidate.reference.decision
              : candidate.reference.specification;
        exclusions.push({
          kind: candidate.kind,
          id: source.id,
          reason: "budget-exceeded",
          details: [
            `Requires ${estimatedTokens} tokens with ${Math.max(0, maxTokens - usedTokens)} remaining`,
          ],
          estimatedTokens,
        });
        continue;
      }
      usedTokens += estimatedTokens;
      if (candidate.kind === "doctrine") {
        selectedDoctrines.push(candidate.reference);
      } else if (candidate.kind === "decision") {
        selectedDecisions.push(candidate.reference);
      } else {
        selectedSpecifications.push(candidate.reference);
      }
    }
  }

  return contextSelectionSchema.parse({
    work,
    doctrines: selectedDoctrines,
    decisions: selectedDecisions,
    specs: selectedSpecifications,
    exclusions: exclusions.sort(
      (left, right) =>
        left.kind.localeCompare(right.kind) ||
        left.id.localeCompare(right.id) ||
        left.reason.localeCompare(right.reason),
    ),
    budget: {
      maxTokens,
      usedTokens,
      remainingTokens: Math.max(0, maxTokens - usedTokens),
      exceeded: usedTokens > maxTokens,
    },
  });
}

export class ContextResolver {
  private readonly estimator: ContextTokenEstimator;

  constructor(options: ContextResolverOptions = {}) {
    this.estimator = options.estimator ?? new CharacterTokenEstimator();
  }

  async resolve(input: ResolveContextInput): Promise<ContextSelection> {
    const maxTokens = input.config.contextBudget.maxTokens;
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new AutoForgeError(
        "INVALID_ARGUMENT",
        "Context budget must be a positive integer",
        { details: { maxTokens }, exitCode: EXIT_CODE.usage },
      );
    }
    const work = resolveWork(input.work, input.taskDescription, this.estimator);
    const doctrine = doctrineCandidates(
      work,
      input.doctrines,
      input.doctrineSessions,
      this.estimator,
    );
    const decision = decisionCandidates(work, input.decisions, this.estimator);
    const specification = await rankSpecifications(
      input.specifications,
      work.objective,
      work.item.scope.include,
      this.estimator,
    );
    return applyBudget(
      work,
      maxTokens,
      doctrine.candidates,
      decision.candidates,
      specification.candidates,
      [
        ...doctrine.exclusions,
        ...decision.exclusions,
        ...specification.exclusions,
      ],
    );
  }
}
