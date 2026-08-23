import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AtomicStateStore } from "../state/store.js";
import type { WorkState } from "../work/schemas.js";
import { evidenceSchema, type Evidence } from "./evidence-schemas.js";
import type { EvidenceStore } from "./evidence-store.js";
import type { ExperimentStore } from "./experiment-store.js";
import type { HypothesisStore } from "./hypothesis-store.js";

export interface RecordEvidenceInput {
  kind: Evidence["kind"];
  summary: string;
  source: string;
  experimentId?: string;
  hypothesisId?: string;
  relatedWork?: string;
}

export interface EvidenceMutationResult {
  evidence: Evidence;
  revision: number;
}

export interface EvidenceServiceOptions {
  now?: () => Date;
}

function evidenceError(
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
  return slug || "evidence";
}

function workIds(state: WorkState): Set<string> {
  return new Set([
    ...state.features.map((item) => item.id),
    ...state.phases.map((item) => item.id),
    ...state.tasks.map((item) => item.id),
    ...state.issues.map((item) => item.id),
  ]);
}

function allocateEvidenceId(
  summary: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `evidence.${slugify(summary)}`;
  if (!existingIds.has(baseId)) {
    return baseId;
  }
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export class EvidenceService {
  private readonly evidenceStore: EvidenceStore;
  private readonly experimentStore: ExperimentStore;
  private readonly hypothesisStore: HypothesisStore;
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly now: () => Date;

  constructor(
    evidenceStore: EvidenceStore,
    experimentStore: ExperimentStore,
    hypothesisStore: HypothesisStore,
    workStore: AtomicStateStore<WorkState>,
    options: EvidenceServiceOptions = {},
  ) {
    this.evidenceStore = evidenceStore;
    this.experimentStore = experimentStore;
    this.hypothesisStore = hypothesisStore;
    this.workStore = workStore;
    this.now = options.now ?? (() => new Date());
  }

  async record(input: RecordEvidenceInput): Promise<EvidenceMutationResult> {
    await this.evidenceStore.ensure();
    const { state: memoryState } = await this.evidenceStore.state.read();

    if (input.experimentId) {
      await this.experimentStore.ensure();
      const { state: experimentState } =
        await this.experimentStore.state.read();
      const known = new Set(
        experimentState.data.experiments.map((item) => item.id),
      );
      if (!known.has(input.experimentId)) {
        throw evidenceError("Evidence references unknown experiment", {
          experimentId: input.experimentId,
        });
      }
    }
    if (input.hypothesisId) {
      await this.hypothesisStore.ensure();
      const { state: hypothesisState } =
        await this.hypothesisStore.state.read();
      const known = new Set(
        hypothesisState.data.hypotheses.map((item) => item.id),
      );
      if (!known.has(input.hypothesisId)) {
        throw evidenceError("Evidence references unknown hypothesis", {
          hypothesisId: input.hypothesisId,
        });
      }
    }
    if (input.relatedWork) {
      const { state: workState } = await this.workStore.read();
      const known = workIds(workState.data);
      if (!known.has(input.relatedWork)) {
        throw evidenceError("Evidence references unknown work", {
          relatedWork: input.relatedWork,
        });
      }
    }

    const timestamp = this.now().toISOString();
    const evidence = evidenceSchema.parse({
      id: allocateEvidenceId(
        input.summary,
        new Set(memoryState.data.evidence.map((item) => item.id)),
      ),
      kind: input.kind,
      summary: input.summary,
      source: input.source,
      experimentId: input.experimentId ?? null,
      hypothesisId: input.hypothesisId ?? null,
      relatedWork: input.relatedWork ?? null,
      resultingDecision: null,
      capturedAt: timestamp,
    });
    const committed = await this.evidenceStore.state.write(
      {
        evidence: [...memoryState.data.evidence, evidence],
      },
      { expectedRevision: memoryState.revision },
    );
    return { evidence, revision: committed.revision };
  }

  async assertEvidenceExists(evidenceIds: readonly string[]): Promise<void> {
    if (evidenceIds.length === 0) return;
    await this.evidenceStore.ensure();
    const { state: memoryState } = await this.evidenceStore.state.read();
    const targetIds = new Set(evidenceIds);
    const unknown = [...targetIds].filter(
      (id) => !memoryState.data.evidence.some((item) => item.id === id),
    );
    if (unknown.length > 0) {
      throw evidenceError("Unknown evidence id", {
        unknownEvidenceIds: unknown,
      });
    }
  }

  async stampResultingDecision(
    evidenceIds: readonly string[],
    decisionId: string,
  ): Promise<void> {
    if (evidenceIds.length === 0) return;
    await this.assertEvidenceExists(evidenceIds);
    await this.evidenceStore.ensure();
    const { state: memoryState } = await this.evidenceStore.state.read();
    const targetIds = new Set(evidenceIds);
    const evidence = memoryState.data.evidence.map((item) =>
      targetIds.has(item.id)
        ? { ...item, resultingDecision: decisionId }
        : item,
    );
    await this.evidenceStore.state.write(
      { evidence },
      { expectedRevision: memoryState.revision },
    );
  }
}
