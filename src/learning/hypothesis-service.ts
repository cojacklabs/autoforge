import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AtomicStateStore } from "../state/store.js";
import type { WorkState } from "../work/schemas.js";
import {
  hypothesisSchema,
  type Hypothesis,
  type HypothesisMemory,
  type HypothesisStatus,
} from "./hypothesis-schemas.js";
import type { HypothesisStore } from "./hypothesis-store.js";

export interface RecordHypothesisInput {
  statement: string;
  expectedOutcome: string;
  metric: string;
  target: string;
  linkedFeature?: string;
}

export interface HypothesisMutationResult {
  hypothesis: Hypothesis;
  revision: number;
}

export interface HypothesisServiceOptions {
  now?: () => Date;
}

function hypothesisError(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_ARGUMENT", message, {
    details,
    exitCode: EXIT_CODE.notFound,
  });
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "hypothesis";
}

function allocateHypothesisId(
  statement: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `hypothesis.${slugify(statement)}`;
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

export class HypothesisService {
  private readonly hypothesisStore: HypothesisStore;
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly now: () => Date;

  constructor(
    hypothesisStore: HypothesisStore,
    workStore: AtomicStateStore<WorkState>,
    options: HypothesisServiceOptions = {},
  ) {
    this.hypothesisStore = hypothesisStore;
    this.workStore = workStore;
    this.now = options.now ?? (() => new Date());
  }

  async record(
    input: RecordHypothesisInput,
  ): Promise<HypothesisMutationResult> {
    await this.hypothesisStore.ensure();
    const [{ state: memoryState }, { state: workState }] = await Promise.all([
      this.hypothesisStore.state.read(),
      this.workStore.read(),
    ]);
    if (input.linkedFeature) {
      const known = workIds(workState.data);
      if (!known.has(input.linkedFeature)) {
        throw hypothesisError("Hypothesis references unknown work", {
          linkedFeature: input.linkedFeature,
        });
      }
    }
    const timestamp = this.now().toISOString();
    const hypothesis = hypothesisSchema.parse({
      id: allocateHypothesisId(
        input.statement,
        new Set(memoryState.data.hypotheses.map((item) => item.id)),
      ),
      statement: input.statement,
      expectedOutcome: input.expectedOutcome,
      metric: input.metric,
      target: input.target,
      linkedFeature: input.linkedFeature ?? null,
      status: "proposed",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.hypothesisStore.state.write(
      {
        hypotheses: [...memoryState.data.hypotheses, hypothesis],
      },
      { expectedRevision: memoryState.revision },
    );
    return { hypothesis, revision: committed.revision };
  }

  async setStatus(
    id: string,
    status: HypothesisStatus,
  ): Promise<HypothesisMutationResult> {
    await this.hypothesisStore.ensure();
    const { state: memoryState } = await this.hypothesisStore.state.read();
    const existing = memoryState.data.hypotheses.find(
      (candidate) => candidate.id === id,
    );
    if (!existing) {
      throw hypothesisError(`Unknown hypothesis ${id}`, { id });
    }
    const timestamp = this.now().toISOString();
    const updated: Hypothesis = { ...existing, status, updatedAt: timestamp };
    const hypotheses: HypothesisMemory["hypotheses"] =
      memoryState.data.hypotheses.map((candidate) =>
        candidate.id === id ? updated : candidate,
      );
    const committed = await this.hypothesisStore.state.write(
      { hypotheses },
      { expectedRevision: memoryState.revision },
    );
    return { hypothesis: updated, revision: committed.revision };
  }
}
