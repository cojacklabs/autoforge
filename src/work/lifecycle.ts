import { randomUUID } from "node:crypto";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AtomicStateStore } from "../state/store.js";
import type {
  ActiveWork,
  SessionState,
  WorkState,
  WorkStatus,
} from "./schemas.js";

export type StartableWorkKind = "task" | "issue";

export interface StartWorkInput {
  kind: StartableWorkKind;
  id: string;
}

export interface StartWorkResult {
  activeWork: ActiveWork;
  sessionId: string;
  workRevision: number;
  sessionRevision: number;
}

export interface CompleteWorkResult {
  completedWork: ActiveWork;
  sessionId: string;
  completedAt: string;
  workRevision: number;
  sessionRevision: number;
}

export interface WorkLifecycleServiceOptions {
  now?: () => Date;
  sessionId?: () => string;
}

function lifecycleError(
  code: "INVALID_ARGUMENT" | "STATE_CONFLICT" | "INVALID_STATE",
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError(code, message, {
    details,
    exitCode:
      code === "INVALID_ARGUMENT"
        ? EXIT_CODE.notFound
        : code === "STATE_CONFLICT"
          ? EXIT_CODE.conflict
          : EXIT_CODE.invalidState,
  });
}

function assertStartableStatus(
  kind: StartableWorkKind,
  id: string,
  status: WorkStatus,
): void {
  if (status === "completed" || status === "canceled") {
    throw lifecycleError(
      "STATE_CONFLICT",
      `Cannot start ${status} ${kind} ${id}`,
      { kind, id, status },
    );
  }
}

export class WorkLifecycleService {
  private readonly workStore: AtomicStateStore<WorkState>;
  private readonly sessionStore: AtomicStateStore<SessionState>;
  private readonly now: () => Date;
  private readonly sessionId: () => string;

  constructor(
    workStore: AtomicStateStore<WorkState>,
    sessionStore: AtomicStateStore<SessionState>,
    options: WorkLifecycleServiceOptions = {},
  ) {
    this.workStore = workStore;
    this.sessionStore = sessionStore;
    this.now = options.now ?? (() => new Date());
    this.sessionId = options.sessionId ?? (() => `session.${randomUUID()}`);
  }

  async start(input: StartWorkInput): Promise<StartWorkResult> {
    const [{ state: workState }, { state: sessionState }] = await Promise.all([
      this.workStore.read(),
      this.sessionStore.read(),
    ]);

    if (workState.data.activeWork !== null) {
      throw lifecycleError(
        "STATE_CONFLICT",
        `Work is already active: ${workState.data.activeWork.id}`,
        { activeWork: workState.data.activeWork },
      );
    }
    if (sessionState.data.current !== null) {
      throw lifecycleError(
        "STATE_CONFLICT",
        `Session is already active: ${sessionState.data.current.id}`,
        { sessionId: sessionState.data.current.id },
      );
    }

    const timestamp = this.now().toISOString();
    const activeWork: ActiveWork = {
      kind: input.kind,
      id: input.id,
      startedAt: timestamp,
    };
    const nextWorkState = this.activateWork(workState.data, input, timestamp);
    const committedWork = await this.workStore.write(nextWorkState, {
      expectedRevision: workState.revision,
    });

    const sessionId = this.sessionId();
    try {
      const committedSession = await this.sessionStore.write(
        {
          ...sessionState.data,
          current: {
            id: sessionId,
            status: "active",
            startedAt: timestamp,
            endedAt: null,
            activeWork,
          },
        },
        { expectedRevision: sessionState.revision },
      );
      return {
        activeWork,
        sessionId,
        workRevision: committedWork.revision,
        sessionRevision: committedSession.revision,
      };
    } catch (sessionError) {
      try {
        await this.workStore.write(workState.data, {
          expectedRevision: committedWork.revision,
        });
      } catch (compensationError) {
        throw new AutoForgeError(
          "INVALID_STATE",
          "Starting work failed and the work state could not be restored",
          {
            cause: sessionError,
            details: {
              kind: input.kind,
              id: input.id,
              compensationError:
                compensationError instanceof Error
                  ? compensationError.message
                  : String(compensationError),
            },
            exitCode: EXIT_CODE.invalidState,
          },
        );
      }
      throw sessionError;
    }
  }

  async complete(): Promise<CompleteWorkResult> {
    const [{ state: workState }, { state: sessionState }] = await Promise.all([
      this.workStore.read(),
      this.sessionStore.read(),
    ]);
    const activeWork = workState.data.activeWork;
    const currentSession = sessionState.data.current;
    if (activeWork === null && currentSession === null) {
      throw lifecycleError(
        "STATE_CONFLICT",
        "There is no active work to complete",
        {},
      );
    }
    if (
      activeWork === null ||
      currentSession === null ||
      currentSession.activeWork === null ||
      currentSession.activeWork.kind !== activeWork.kind ||
      currentSession.activeWork.id !== activeWork.id
    ) {
      throw lifecycleError(
        "INVALID_STATE",
        "Active work and the current session do not agree",
        { activeWork, currentSession },
      );
    }

    const completedAt = this.now().toISOString();
    const nextWorkState = this.completeActiveWork(
      workState.data,
      activeWork,
      completedAt,
    );
    const committedWork = await this.workStore.write(nextWorkState, {
      expectedRevision: workState.revision,
    });

    try {
      const committedSession = await this.sessionStore.write(
        {
          current: null,
          previous: [
            ...sessionState.data.previous,
            {
              ...currentSession,
              status: "ended",
              endedAt: completedAt,
            },
          ],
        },
        { expectedRevision: sessionState.revision },
      );
      return {
        completedWork: activeWork,
        sessionId: currentSession.id,
        completedAt,
        workRevision: committedWork.revision,
        sessionRevision: committedSession.revision,
      };
    } catch (sessionError) {
      try {
        await this.workStore.write(workState.data, {
          expectedRevision: committedWork.revision,
        });
      } catch (compensationError) {
        throw new AutoForgeError(
          "INVALID_STATE",
          "Completing work failed and the work state could not be restored",
          {
            cause: sessionError,
            details: {
              kind: activeWork.kind,
              id: activeWork.id,
              compensationError:
                compensationError instanceof Error
                  ? compensationError.message
                  : String(compensationError),
            },
            exitCode: EXIT_CODE.invalidState,
          },
        );
      }
      throw sessionError;
    }
  }

  private activateWork(
    state: WorkState,
    input: StartWorkInput,
    timestamp: string,
  ): WorkState {
    if (input.kind === "task") {
      const task = state.tasks.find((candidate) => candidate.id === input.id);
      if (!task) {
        throw lifecycleError("INVALID_ARGUMENT", `Unknown task ${input.id}`, {
          kind: input.kind,
          id: input.id,
        });
      }
      assertStartableStatus(input.kind, input.id, task.status);
      return {
        ...state,
        tasks: state.tasks.map((candidate) =>
          candidate.id === input.id
            ? { ...candidate, status: "active", updatedAt: timestamp }
            : candidate,
        ),
        activeWork: { kind: input.kind, id: input.id, startedAt: timestamp },
      };
    }

    const issue = state.issues.find((candidate) => candidate.id === input.id);
    if (!issue) {
      throw lifecycleError("INVALID_ARGUMENT", `Unknown issue ${input.id}`, {
        kind: input.kind,
        id: input.id,
      });
    }
    assertStartableStatus(input.kind, input.id, issue.status);
    return {
      ...state,
      issues: state.issues.map((candidate) =>
        candidate.id === input.id
          ? { ...candidate, status: "active", updatedAt: timestamp }
          : candidate,
      ),
      activeWork: { kind: input.kind, id: input.id, startedAt: timestamp },
    };
  }

  private completeActiveWork(
    state: WorkState,
    activeWork: ActiveWork,
    timestamp: string,
  ): WorkState {
    if (activeWork.kind === "task") {
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === activeWork.id
            ? { ...task, status: "completed", updatedAt: timestamp }
            : task,
        ),
        activeWork: null,
      };
    }

    return {
      ...state,
      issues: state.issues.map((issue) =>
        issue.id === activeWork.id
          ? { ...issue, status: "completed", updatedAt: timestamp }
          : issue,
      ),
      activeWork: null,
    };
  }
}
