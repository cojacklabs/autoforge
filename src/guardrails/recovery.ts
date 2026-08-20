import { randomUUID } from "node:crypto";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import {
  createDoctrineSessionStore,
  DoctrineSessionService,
} from "../doctrine/session.js";
import { createDoctrineStore } from "../doctrine/store.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../state/kernel.js";

export interface SessionRecoveryOptions {
  now?: () => Date;
  sessionId?: () => string;
}

export interface SessionRecoveryResult {
  status: "healthy" | "repaired";
  sessionId: string | null;
  repairs: string[];
}

function unrecoverable(message: string, details: Record<string, unknown>) {
  return new AutoForgeError("INVALID_STATE", message, {
    details,
    exitCode: EXIT_CODE.invalidState,
  });
}

export class SessionRecoveryService {
  private readonly now: () => Date;
  private readonly sessionId: () => string;

  constructor(
    private readonly projectRoot: string,
    options: SessionRecoveryOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.sessionId = options.sessionId ?? (() => `session.${randomUUID()}`);
  }

  async repair(): Promise<SessionRecoveryResult> {
    const workStore = createWorkStateStore(this.projectRoot);
    const sessionStore = createSessionStateStore(this.projectRoot);
    const doctrineSessionStore = createDoctrineSessionStore(this.projectRoot);
    const [workEnvelope, sessionEnvelope, doctrineEnvelope, registryEnvelope] =
      await Promise.all([
        workStore.read(),
        sessionStore.read(),
        doctrineSessionStore.read(),
        createDoctrineStore(this.projectRoot).read(),
      ]);
    const active = workEnvelope.state.data.activeWork;
    const currentSession = sessionEnvelope.state.data.current;
    const currentDoctrine = doctrineEnvelope.state.data.current;
    const doctrineService = new DoctrineSessionService(
      doctrineSessionStore,
      registryEnvelope.state.data,
      workEnvelope.state.data,
      { now: this.now },
    );

    if (active === null) {
      if (currentSession !== null) {
        throw unrecoverable(
          "A current session exists without active work; automatic recovery would be ambiguous",
          { sessionId: currentSession.id },
        );
      }
      if (currentDoctrine !== null) {
        await doctrineService.cancel(currentDoctrine.sessionId);
        return {
          status: "repaired",
          sessionId: null,
          repairs: [
            `Removed orphan doctrine session ${currentDoctrine.sessionId}`,
          ],
        };
      }
      return { status: "healthy", sessionId: null, repairs: [] };
    }

    if (
      currentSession !== null &&
      (currentSession.activeWork === null ||
        currentSession.activeWork.kind !== active.kind ||
        currentSession.activeWork.id !== active.id ||
        currentSession.activeWork.startedAt !== active.startedAt ||
        currentSession.startedAt !== active.startedAt)
    ) {
      throw unrecoverable(
        "Current session conflicts with active work; automatic recovery would overwrite valid state",
        { activeWork: active, currentSession },
      );
    }
    if (
      currentDoctrine !== null &&
      (currentDoctrine.workKind !== active.kind ||
        currentDoctrine.workId !== active.id ||
        (currentSession !== null &&
          currentDoctrine.sessionId !== currentSession.id))
    ) {
      throw unrecoverable(
        "Doctrine session conflicts with active work or the current session",
        { activeWork: active, currentSession, currentDoctrine },
      );
    }

    const sessionId =
      currentSession?.id ?? currentDoctrine?.sessionId ?? this.sessionId();
    const repairs: string[] = [];
    let createdDoctrine = false;
    if (currentDoctrine === null) {
      await doctrineService.select({
        sessionId,
        workKind: active.kind,
        workId: active.id,
      });
      createdDoctrine = true;
      repairs.push(`Rebuilt doctrine session ${sessionId}`);
    }

    if (currentSession === null) {
      try {
        await sessionStore.write(
          {
            ...sessionEnvelope.state.data,
            current: {
              id: sessionId,
              status: "active",
              startedAt: active.startedAt,
              endedAt: null,
              activeWork: active,
            },
          },
          { expectedRevision: sessionEnvelope.state.revision },
        );
      } catch (error) {
        if (createdDoctrine) {
          try {
            await doctrineService.cancel(sessionId);
          } catch (compensationError) {
            throw new AutoForgeError(
              "INVALID_STATE",
              "Session recovery failed and the doctrine repair could not be restored",
              {
                cause: error,
                details: {
                  sessionId,
                  compensationError:
                    compensationError instanceof Error
                      ? compensationError.message
                      : String(compensationError),
                },
                exitCode: EXIT_CODE.invalidState,
              },
            );
          }
        }
        throw error;
      }
      repairs.push(`Rebuilt work session ${sessionId}`);
    }

    return {
      status: repairs.length > 0 ? "repaired" : "healthy",
      sessionId,
      repairs,
    };
  }
}
