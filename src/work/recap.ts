import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AtomicStateStore } from "../state/store.js";
import {
  workStatusSchema,
  type ActiveWork,
  type Feature,
  type Issue,
  type Phase,
  type Session,
  type SessionState,
  type Task,
  type WorkScope,
  type WorkState,
  type WorkStatus,
} from "./schemas.js";

// Derived from workStatusSchema so this list can never drift from the
// authoritative status enum (a hand-maintained copy previously omitted
// "paused", producing NaN counts once any item was paused).
const WORK_STATUSES: readonly WorkStatus[] = workStatusSchema.options;

export interface RecapInventory {
  features: number;
  phases: number;
  tasks: number;
  issues: number;
}

export interface RecapSession {
  id: string;
  startedAt: string;
  elapsedSeconds: number;
}

interface RecapActiveBase {
  id: string;
  name: string;
  description: string;
  scope: WorkScope;
  startedAt: string;
}

export interface RecapActiveTask extends RecapActiveBase {
  kind: "task";
  phase: Pick<Phase, "id" | "name" | "sequence">;
  feature: Pick<Feature, "id" | "name">;
}

export interface RecapActiveIssue extends RecapActiveBase {
  kind: "issue";
}

export type RecapActiveWork = RecapActiveTask | RecapActiveIssue;

interface RecapBase {
  inventory: RecapInventory;
  actionableByStatus: Record<WorkStatus, number>;
  recentSession: Session | null;
}

export interface IdleRecap extends RecapBase {
  status: "idle";
  active: null;
  session: null;
}

export interface ActiveRecap extends RecapBase {
  status: "active";
  active: RecapActiveWork;
  session: RecapSession;
}

export type WorkRecap = IdleRecap | ActiveRecap;

export interface WorkRecapServiceOptions {
  now?: () => Date;
}

function invalidRecapState(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_STATE", message, {
    details,
    exitCode: EXIT_CODE.invalidState,
  });
}

function countActionableStatuses(state: WorkState): Record<WorkStatus, number> {
  const counts = Object.fromEntries(
    WORK_STATUSES.map((status) => [status, 0]),
  ) as Record<WorkStatus, number>;
  for (const item of [...state.tasks, ...state.issues]) {
    counts[item.status] += 1;
  }
  return counts;
}

function assertMatchingActiveState(
  activeWork: ActiveWork | null,
  currentSession: Session | null,
): void {
  if (activeWork === null && currentSession === null) {
    return;
  }
  if (
    activeWork === null ||
    currentSession === null ||
    currentSession.activeWork === null ||
    currentSession.activeWork.kind !== activeWork.kind ||
    currentSession.activeWork.id !== activeWork.id ||
    currentSession.activeWork.startedAt !== activeWork.startedAt
  ) {
    throw invalidRecapState(
      "Active work and the current session do not agree",
      { activeWork, currentSession },
    );
  }
}

export class WorkRecapService {
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly sessionStore: AtomicStateStore<SessionState>;
  private readonly now: () => Date;

  constructor(
    workStore: AtomicStateStore<WorkState>,
    sessionStore: AtomicStateStore<SessionState>,
    options: WorkRecapServiceOptions = {},
  ) {
    this.workStore = workStore;
    this.sessionStore = sessionStore;
    this.now = options.now ?? (() => new Date());
  }

  async read(): Promise<WorkRecap> {
    const [{ state: workEnvelope }, { state: sessionEnvelope }] =
      await Promise.all([this.workStore.read(), this.sessionStore.read()]);
    const work = workEnvelope.data;
    const sessions = sessionEnvelope.data;
    assertMatchingActiveState(work.activeWork, sessions.current);

    const base: RecapBase = {
      inventory: {
        features: work.features.length,
        phases: work.phases.length,
        tasks: work.tasks.length,
        issues: work.issues.length,
      },
      actionableByStatus: countActionableStatuses(work),
      recentSession: sessions.previous.at(-1) ?? null,
    };
    if (work.activeWork === null || sessions.current === null) {
      return { ...base, status: "idle", active: null, session: null };
    }

    return {
      ...base,
      status: "active",
      active: this.resolveActiveWork(work, work.activeWork),
      session: {
        id: sessions.current.id,
        startedAt: sessions.current.startedAt,
        elapsedSeconds: Math.max(
          0,
          Math.floor(
            (this.now().getTime() - Date.parse(sessions.current.startedAt)) /
              1000,
          ),
        ),
      },
    };
  }

  private resolveActiveWork(
    state: WorkState,
    activeWork: ActiveWork,
  ): RecapActiveWork {
    if (activeWork.kind === "issue") {
      const issue = state.issues.find((item) => item.id === activeWork.id);
      if (!issue) {
        throw invalidRecapState(`Unknown active issue ${activeWork.id}`, {
          activeWork,
        });
      }
      return this.projectIssue(issue, activeWork.startedAt);
    }

    const task = state.tasks.find((item) => item.id === activeWork.id);
    const phase = task
      ? state.phases.find((item) => item.id === task.phaseId)
      : undefined;
    const feature = phase
      ? state.features.find((item) => item.id === phase.featureId)
      : undefined;
    if (!task || !phase || !feature) {
      throw invalidRecapState(
        `Unable to resolve hierarchy for active task ${activeWork.id}`,
        { activeWork },
      );
    }
    return {
      kind: "task",
      id: task.id,
      name: task.name,
      description: task.description,
      scope: task.scope,
      startedAt: activeWork.startedAt,
      phase: { id: phase.id, name: phase.name, sequence: phase.sequence },
      feature: { id: feature.id, name: feature.name },
    };
  }

  private projectIssue(issue: Issue, startedAt: string): RecapActiveIssue {
    return {
      kind: "issue",
      id: issue.id,
      name: issue.name,
      description: issue.description,
      scope: issue.scope,
      startedAt,
    };
  }
}
