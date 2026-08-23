import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { DecisionService } from "../decisions/service.js";
import type { EvidenceService } from "../learning/evidence-service.js";
import type { AtomicStateStore } from "../state/store.js";
import type { WorkState } from "../work/schemas.js";
import {
  strategyAssessmentSchema,
  type StrategyAssessment,
  type StrategyDecision,
  type StrategyFactors,
} from "./strategy-schemas.js";
import type { StrategyStore } from "./strategy-store.js";

export interface RecordStrategyAssessmentInput {
  workId: string;
  factors: StrategyFactors;
  decision: StrategyDecision;
  rationale: string;
  evidenceIds: string[];
  supersedes?: string;
}

export interface StrategyMutationResult {
  assessment: StrategyAssessment;
  revision: number;
}

export interface StrategyServiceOptions {
  now?: () => Date;
}

function strategyError(
  message: string,
  details: Readonly<Record<string, unknown>>,
  conflict = false,
): AutoForgeError {
  return new AutoForgeError(
    conflict ? "STATE_CONFLICT" : "INVALID_ARGUMENT",
    message,
    {
      details,
      exitCode: conflict ? EXIT_CODE.conflict : EXIT_CODE.notFound,
    },
  );
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "assessment";
}

function allocateStrategyId(
  workId: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `strategy.${slugify(workId)}`;
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

function workIds(state: WorkState): Set<string> {
  return new Set([
    ...state.features.map((item) => item.id),
    ...state.phases.map((item) => item.id),
    ...state.tasks.map((item) => item.id),
    ...state.issues.map((item) => item.id),
  ]);
}

function factorSummary(factors: StrategyFactors): string {
  return Object.entries(factors)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export class StrategyService {
  private readonly strategyStore: StrategyStore;
  private readonly decisionService: DecisionService;
  private readonly evidenceService: EvidenceService;
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly now: () => Date;

  constructor(
    strategyStore: StrategyStore,
    decisionService: DecisionService,
    evidenceService: EvidenceService,
    workStore: AtomicStateStore<WorkState>,
    options: StrategyServiceOptions = {},
  ) {
    this.strategyStore = strategyStore;
    this.decisionService = decisionService;
    this.evidenceService = evidenceService;
    this.workStore = workStore;
    this.now = options.now ?? (() => new Date());
  }

  async assess(
    input: RecordStrategyAssessmentInput,
  ): Promise<StrategyMutationResult> {
    const { state: workState } = await this.workStore.read();
    const knownWorkIds = workIds(workState.data);
    if (!knownWorkIds.has(input.workId)) {
      throw strategyError("Strategy assessment references unknown work", {
        workId: input.workId,
      });
    }

    if (input.evidenceIds.length > 0) {
      await this.evidenceService.assertEvidenceExists(input.evidenceIds);
    }

    await this.strategyStore.ensure();
    const { state: memoryState } = await this.strategyStore.state.read();

    const target = input.supersedes
      ? memoryState.data.assessments.find(
          (assessment) => assessment.id === input.supersedes,
        )
      : undefined;
    if (input.supersedes && !target) {
      throw strategyError(`Unknown strategy assessment ${input.supersedes}`, {
        id: input.supersedes,
      });
    }
    if (target && target.status !== "active") {
      throw strategyError(
        `Strategy assessment ${target.id} cannot be superseded from ${target.status} status`,
        { id: target.id, status: target.status },
        true,
      );
    }

    const timestamp = this.now().toISOString();
    const decisionResult = await this.decisionService.record({
      statement: `${input.workId}: strategic assessment recommends ${input.decision}`,
      reasoning: input.rationale,
      consequences: [factorSummary(input.factors)],
      scope: ["strategy"],
      keywords: ["strategy", input.decision],
      relatedWork: [input.workId],
      kind: "feature-note",
      ...(input.evidenceIds.length > 0 ? { evidence: input.evidenceIds } : {}),
    });

    const assessment = strategyAssessmentSchema.parse({
      id: allocateStrategyId(
        input.workId,
        new Set(memoryState.data.assessments.map((item) => item.id)),
      ),
      workId: input.workId,
      factors: input.factors,
      decision: input.decision,
      rationale: input.rationale,
      evidenceIds: input.evidenceIds,
      resultingDecision: decisionResult.decision.id,
      supersedes: target?.id ?? null,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const assessments = target
      ? [
          ...memoryState.data.assessments.map((candidate) =>
            candidate.id === target.id
              ? {
                  ...candidate,
                  status: "superseded" as const,
                  updatedAt: timestamp,
                }
              : candidate,
          ),
          assessment,
        ]
      : [...memoryState.data.assessments, assessment];

    const committed = await this.strategyStore.state.write(
      { assessments },
      { expectedRevision: memoryState.revision },
    );

    return { assessment, revision: committed.revision };
  }

  async history(workId: string): Promise<StrategyAssessment[]> {
    await this.strategyStore.ensure();
    const { state } = await this.strategyStore.state.read();
    return state.data.assessments
      .filter((assessment) => assessment.workId === workId)
      .map((assessment, index) => ({ assessment, index }))
      .sort(
        (left, right) =>
          right.assessment.createdAt.localeCompare(left.assessment.createdAt) ||
          right.index - left.index,
      )
      .map(({ assessment }) => assessment);
  }
}
