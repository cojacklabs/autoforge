import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AtomicStateStore } from "../state/store.js";
import {
  featureSchema,
  issueSchema,
  phaseSchema,
  taskSchema,
  type Feature,
  type Issue,
  type Phase,
  type Task,
  type WorkScope,
  type WorkState,
} from "./schemas.js";

export interface CreateFeatureInput {
  name: string;
  description: string;
}

export interface CreatePhaseInput {
  featureId: string;
  name: string;
  description: string;
}

export interface CreateTaskInput {
  phaseId: string;
  name: string;
  description: string;
  scope: WorkScope;
}

export interface CreateIssueInput {
  name: string;
  description: string;
  scope: WorkScope;
}

export interface WorkCreationResult<Entity> {
  entity: Entity;
  revision: number;
}

export interface WorkServiceOptions {
  now?: () => Date;
}

function missingParent(kind: "feature" | "phase", id: string): AutoForgeError {
  return new AutoForgeError(
    "INVALID_ARGUMENT",
    `Cannot create work for unknown ${kind} ${id}`,
    {
      details: { kind, id },
      exitCode: EXIT_CODE.notFound,
    },
  );
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "work";
}

function allocateId(
  kind: "feature" | "phase" | "task" | "issue",
  name: string,
  existingIds: ReadonlySet<string>,
): string {
  const baseId = `${kind}.${slugify(name)}`;
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export class WorkService {
  private readonly store: AtomicStateStore<WorkState>;
  private readonly now: () => Date;

  constructor(
    store: AtomicStateStore<WorkState>,
    options: WorkServiceOptions = {},
  ) {
    this.store = store;
    this.now = options.now ?? (() => new Date());
  }

  async createFeature(
    input: CreateFeatureInput,
  ): Promise<WorkCreationResult<Feature>> {
    const { state } = await this.store.read();
    const timestamp = this.now().toISOString();
    const feature = featureSchema.parse({
      id: allocateId(
        "feature",
        input.name,
        new Set(state.data.features.map((item) => item.id)),
      ),
      name: input.name,
      description: input.description,
      status: "planned",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.store.write(
      { ...state.data, features: [...state.data.features, feature] },
      { expectedRevision: state.revision },
    );
    return { entity: feature, revision: committed.revision };
  }

  async createPhase(
    input: CreatePhaseInput,
  ): Promise<WorkCreationResult<Phase>> {
    const { state } = await this.store.read();
    if (
      !state.data.features.some((feature) => feature.id === input.featureId)
    ) {
      throw missingParent("feature", input.featureId);
    }

    const timestamp = this.now().toISOString();
    const siblingSequences = state.data.phases
      .filter((phase) => phase.featureId === input.featureId)
      .map((phase) => phase.sequence);
    const phase = phaseSchema.parse({
      id: allocateId(
        "phase",
        input.name,
        new Set(state.data.phases.map((item) => item.id)),
      ),
      featureId: input.featureId,
      sequence: Math.max(0, ...siblingSequences) + 1,
      name: input.name,
      description: input.description,
      status: "planned",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.store.write(
      { ...state.data, phases: [...state.data.phases, phase] },
      { expectedRevision: state.revision },
    );
    return { entity: phase, revision: committed.revision };
  }

  async createTask(input: CreateTaskInput): Promise<WorkCreationResult<Task>> {
    const { state } = await this.store.read();
    if (!state.data.phases.some((phase) => phase.id === input.phaseId)) {
      throw missingParent("phase", input.phaseId);
    }

    const timestamp = this.now().toISOString();
    const task = taskSchema.parse({
      id: allocateId(
        "task",
        input.name,
        new Set(state.data.tasks.map((item) => item.id)),
      ),
      phaseId: input.phaseId,
      name: input.name,
      description: input.description,
      status: "planned",
      scope: input.scope,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.store.write(
      { ...state.data, tasks: [...state.data.tasks, task] },
      { expectedRevision: state.revision },
    );
    return { entity: task, revision: committed.revision };
  }

  async createIssue(
    input: CreateIssueInput,
  ): Promise<WorkCreationResult<Issue>> {
    const { state } = await this.store.read();
    const timestamp = this.now().toISOString();
    const issue = issueSchema.parse({
      id: allocateId(
        "issue",
        input.name,
        new Set(state.data.issues.map((item) => item.id)),
      ),
      name: input.name,
      description: input.description,
      status: "planned",
      scope: input.scope,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const committed = await this.store.write(
      { ...state.data, issues: [...state.data.issues, issue] },
      { expectedRevision: state.revision },
    );
    return { entity: issue, revision: committed.revision };
  }
}
