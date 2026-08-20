import { matchesRepositoryPattern } from "../core/patterns.js";
import type { DoctrineSessionState } from "../doctrine/session.js";
import type { DoctrineRegistry } from "../doctrine/schemas.js";
import type { SessionState, WorkState } from "../work/schemas.js";
import {
  guardrailReportSchema,
  type GuardrailCheck,
  type GuardrailEnforcement,
  type GuardrailReport,
} from "./schemas.js";

export type ContextFreshness = "current" | "missing" | "stale";

export interface EvaluateGuardrailsInput {
  work: WorkState;
  sessions: SessionState;
  doctrineSessions: DoctrineSessionState;
  doctrines: DoctrineRegistry;
  contextFreshness: ContextFreshness;
  enforcement: GuardrailEnforcement;
  agentId?: string;
  targetPath?: string;
}

function activeWorkCheck(work: WorkState): GuardrailCheck {
  return work.activeWork
    ? {
        id: "active-work",
        status: "pass",
        message: `Active ${work.activeWork.kind} ${work.activeWork.id} governs this operation.`,
      }
    : {
        id: "active-work",
        status: "fail",
        message: 'No work is active. Run "autoforge start" before editing.',
      };
}

function sessionCheck(work: WorkState, sessions: SessionState): GuardrailCheck {
  const active = work.activeWork;
  const current = sessions.current;
  const matches =
    active !== null &&
    current !== null &&
    current.status === "active" &&
    current.activeWork !== null &&
    current.activeWork.kind === active.kind &&
    current.activeWork.id === active.id &&
    current.activeWork.startedAt === active.startedAt &&
    current.startedAt === active.startedAt;
  return matches
    ? {
        id: "session-consistency",
        status: "pass",
        message: `Session ${current.id} matches active work.`,
      }
    : {
        id: "session-consistency",
        status: "fail",
        message:
          'Active work and session state do not agree. Run "autoforge check --repair".',
      };
}

function doctrineCheck(
  work: WorkState,
  sessions: SessionState,
  doctrineSessions: DoctrineSessionState,
  doctrines: DoctrineRegistry,
): GuardrailCheck {
  const active = work.activeWork;
  const currentSession = sessions.current;
  const doctrineSession = doctrineSessions.current;
  const doctrinesById = new Map(
    doctrines.doctrines.map((doctrine) => [doctrine.id, doctrine]),
  );
  const selectionsValid = doctrineSession?.selections.every(
    (selection) => doctrinesById.get(selection.doctrineId)?.status === "active",
  );
  const valid =
    active !== null &&
    currentSession !== null &&
    doctrineSession !== null &&
    doctrineSession.sessionId === currentSession.id &&
    doctrineSession.workKind === active.kind &&
    doctrineSession.workId === active.id &&
    doctrineSession.selections.some(
      (selection) => selection.doctrineId === "doctrine.router",
    ) &&
    selectionsValid === true;
  return valid
    ? {
        id: "doctrine-requirements",
        status: "pass",
        message: `${doctrineSession.selections.length} active doctrine selections govern this session.`,
      }
    : {
        id: "doctrine-requirements",
        status: "fail",
        message:
          'Required doctrine is missing or inactive. Run "autoforge check --repair".',
      };
}

function contextCheck(freshness: ContextFreshness): GuardrailCheck {
  if (freshness === "current") {
    return {
      id: "context-current",
      status: "pass",
      message: "Canonical context matches the current deterministic packet.",
    };
  }
  return {
    id: "context-current",
    status: "fail",
    message:
      freshness === "missing"
        ? 'Canonical context is missing. Run "autoforge check --refresh".'
        : 'Canonical context is stale. Run "autoforge check --refresh".',
  };
}

function scopeCheck(
  work: WorkState,
  targetPath: string | undefined,
): GuardrailCheck {
  if (!targetPath) {
    return {
      id: "scope-boundary",
      status: "warn",
      message: "No target path was supplied; scope was not evaluated.",
    };
  }
  const active = work.activeWork;
  if (!active) {
    return {
      id: "scope-boundary",
      status: "fail",
      message: `Cannot authorize ${targetPath} without active work.`,
    };
  }
  const collection = active.kind === "task" ? work.tasks : work.issues;
  const item = collection.find((candidate) => candidate.id === active.id);
  if (!item) {
    return {
      id: "scope-boundary",
      status: "fail",
      message: `Cannot resolve scope for ${active.id}.`,
    };
  }
  const included = item.scope.include.some((pattern) =>
    matchesRepositoryPattern(targetPath, pattern),
  );
  const excluded = item.scope.exclude.some((pattern) =>
    matchesRepositoryPattern(targetPath, pattern),
  );
  return included && !excluded
    ? {
        id: "scope-boundary",
        status: "pass",
        message: `${targetPath} is inside the declared work scope.`,
      }
    : {
        id: "scope-boundary",
        status: "fail",
        message: excluded
          ? `${targetPath} is explicitly excluded from active work scope.`
          : `${targetPath} is outside active work scope.`,
      };
}

export function evaluateGuardrails(
  input: EvaluateGuardrailsInput,
): GuardrailReport {
  const checks = [
    activeWorkCheck(input.work),
    sessionCheck(input.work, input.sessions),
    doctrineCheck(
      input.work,
      input.sessions,
      input.doctrineSessions,
      input.doctrines,
    ),
    contextCheck(input.contextFreshness),
    scopeCheck(input.work, input.targetPath),
  ];
  return guardrailReportSchema.parse({
    allowed: !checks.some((check) => check.status === "fail"),
    enforcement: input.enforcement,
    agentId: input.agentId ?? null,
    workId: input.work.activeWork?.id ?? null,
    targetPath: input.targetPath ?? null,
    checks,
  });
}
