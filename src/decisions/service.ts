import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AtomicStateStore } from "../state/store.js";
import type { WorkState } from "../work/schemas.js";
import {
  decisionSchema,
  type Decision,
  type DecisionMemory,
} from "./schemas.js";

export interface RecordDecisionInput {
  statement: string;
  reasoning: string;
  consequences: string[];
  scope: string[];
  keywords: string[];
  relatedWork: string[];
  supersedes?: string;
}

export interface DecisionMutationResult {
  decision: Decision;
  revision: number;
}

export interface DecisionServiceOptions {
  now?: () => Date;
}

function decisionError(
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
  return slug || "decision";
}

function allocateDecisionId(
  statement: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `decision.${slugify(statement)}`;
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

export class DecisionService {
  private readonly decisionStore: AtomicStateStore<DecisionMemory>;
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly now: () => Date;

  constructor(
    decisionStore: AtomicStateStore<DecisionMemory>,
    workStore: AtomicStateStore<WorkState>,
    options: DecisionServiceOptions = {},
  ) {
    this.decisionStore = decisionStore;
    this.workStore = workStore;
    this.now = options.now ?? (() => new Date());
  }

  async record(input: RecordDecisionInput): Promise<DecisionMutationResult> {
    const [{ state: decisionState }, { state: workState }] = await Promise.all([
      this.decisionStore.read(),
      this.workStore.read(),
    ]);
    const knownWorkIds = workIds(workState.data);
    const unknownWorkIds = input.relatedWork.filter(
      (id) => !knownWorkIds.has(id),
    );
    if (unknownWorkIds.length > 0) {
      throw decisionError("Decision references unknown work", {
        unknownWorkIds,
      });
    }

    const target = input.supersedes
      ? decisionState.data.decisions.find(
          (decision) => decision.id === input.supersedes,
        )
      : undefined;
    if (input.supersedes && !target) {
      throw decisionError(`Unknown decision ${input.supersedes}`, {
        id: input.supersedes,
      });
    }
    if (target && target.status !== "active") {
      throw decisionError(
        `Decision ${target.id} cannot be superseded from ${target.status} status`,
        { id: target.id, status: target.status },
        true,
      );
    }

    const timestamp = this.now().toISOString();
    const decision = decisionSchema.parse({
      id: allocateDecisionId(
        input.statement,
        new Set(decisionState.data.decisions.map((item) => item.id)),
      ),
      statement: input.statement,
      reasoning: input.reasoning,
      consequences: input.consequences,
      scope: input.scope,
      keywords: input.keywords,
      relatedWork: input.relatedWork,
      supersedes: target?.id ?? null,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const decisions = target
      ? [
          ...decisionState.data.decisions.map((candidate) =>
            candidate.id === target.id
              ? {
                  ...candidate,
                  status: "superseded" as const,
                  updatedAt: timestamp,
                }
              : candidate,
          ),
          decision,
        ]
      : [...decisionState.data.decisions, decision];
    const committed = await this.decisionStore.write(
      { decisions },
      { expectedRevision: decisionState.revision },
    );
    return { decision, revision: committed.revision };
  }
}
