import { randomUUID } from "node:crypto";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  createDoctrineSessionStore,
  DoctrineSessionService,
} from "../doctrine/session.js";
import { createDoctrineStore } from "../doctrine/store.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../state/kernel.js";
import {
  WorkLifecycleService,
  type StartableWorkKind,
} from "../work/lifecycle.js";

export interface ResumeCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
  sessionId?: () => string;
}

function isResumableKind(value: string): value is StartableWorkKind {
  return value === "task" || value === "issue";
}

export async function runResumeCommand(
  options: ResumeCommandOptions,
): Promise<ExitCode> {
  const [kind, id, ...extra] = options.args;
  if (!kind || !isResumableKind(kind) || !id || extra.length > 0) {
    options.output.stderr("Usage: autoforge resume <task|issue> <id>");
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const sessionStore = createSessionStateStore(project.path);
  const doctrineSessionStore = createDoctrineSessionStore(project.path);
  const [{ state: work }, { state: doctrines }] = await Promise.all([
    workStore.read(),
    createDoctrineStore(project.path).read(),
  ]);
  const timestamp = (options.now ?? (() => new Date()))();
  const now = () => timestamp;
  const sessionId = (options.sessionId ?? (() => `session.${randomUUID()}`))();
  const doctrineSession = new DoctrineSessionService(
    doctrineSessionStore,
    doctrines.data,
    work.data,
    { now },
  );
  await doctrineSession.select({ sessionId, workKind: kind, workId: id });

  let result;
  try {
    result = await new WorkLifecycleService(workStore, sessionStore, {
      now,
      sessionId: () => sessionId,
    }).resume({ kind, id });
  } catch (error) {
    await doctrineSession.cancel(sessionId);
    throw error;
  }
  options.output.stdout(
    `Resumed ${result.activeWork.kind} ${result.activeWork.id} in ${result.sessionId}.`,
  );
  return EXIT_CODE.success;
}
