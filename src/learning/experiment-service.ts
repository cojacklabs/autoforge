import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { experimentSchema, type Experiment } from "./experiment-schemas.js";
import type { ExperimentStore } from "./experiment-store.js";
import type { HypothesisStore } from "./hypothesis-store.js";

export interface RecordExperimentInput {
  hypothesisIds: string[];
  method: string;
}

export interface ExperimentMutationResult {
  experiment: Experiment;
  revision: number;
}

export interface ExperimentServiceOptions {
  now?: () => Date;
}

function experimentError(
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
  return slug || "experiment";
}

function allocateExperimentId(
  method: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `experiment.${slugify(method)}`;
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export class ExperimentService {
  private readonly experimentStore: ExperimentStore;
  private readonly hypothesisStore: HypothesisStore;
  private readonly now: () => Date;

  constructor(
    experimentStore: ExperimentStore,
    hypothesisStore: HypothesisStore,
    options: ExperimentServiceOptions = {},
  ) {
    this.experimentStore = experimentStore;
    this.hypothesisStore = hypothesisStore;
    this.now = options.now ?? (() => new Date());
  }

  async record(
    input: RecordExperimentInput,
  ): Promise<ExperimentMutationResult> {
    await this.experimentStore.ensure();
    await this.hypothesisStore.ensure();
    const [{ state: memoryState }, { state: hypothesisState }] =
      await Promise.all([
        this.experimentStore.state.read(),
        this.hypothesisStore.state.read(),
      ]);
    const knownHypotheses = new Set(
      hypothesisState.data.hypotheses.map((item) => item.id),
    );
    const unknown = input.hypothesisIds.filter(
      (id) => !knownHypotheses.has(id),
    );
    if (unknown.length > 0) {
      throw experimentError("Experiment references unknown hypothesis", {
        unknownHypothesisIds: unknown,
      });
    }
    const timestamp = this.now().toISOString();
    const experiment = experimentSchema.parse({
      id: allocateExperimentId(
        input.method,
        new Set(memoryState.data.experiments.map((item) => item.id)),
      ),
      hypothesisIds: input.hypothesisIds,
      method: input.method,
      status: "planned",
      startedAt: timestamp,
      endedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.experimentStore.state.write(
      {
        experiments: [...memoryState.data.experiments, experiment],
      },
      { expectedRevision: memoryState.revision },
    );
    return { experiment, revision: committed.revision };
  }

  async complete(id: string): Promise<ExperimentMutationResult> {
    await this.experimentStore.ensure();
    const { state: memoryState } = await this.experimentStore.state.read();
    const existing = memoryState.data.experiments.find(
      (candidate) => candidate.id === id,
    );
    if (!existing) {
      throw experimentError(`Unknown experiment ${id}`, { id });
    }
    const timestamp = this.now().toISOString();
    const updated: Experiment = {
      ...existing,
      status: "completed",
      endedAt: timestamp,
      updatedAt: timestamp,
    };
    const experiments = memoryState.data.experiments.map((candidate) =>
      candidate.id === id ? updated : candidate,
    );
    const committed = await this.experimentStore.state.write(
      { experiments },
      { expectedRevision: memoryState.revision },
    );
    return { experiment: updated, revision: committed.revision };
  }
}
