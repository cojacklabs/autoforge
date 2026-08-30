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
import { WorkLifecycleService } from "../work/lifecycle.js";

export interface PauseCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
}

function usage(output: LogWriter): ExitCode {
  output.stderr('Usage: autoforge pause "<reason>"');
  return EXIT_CODE.usage;
}

export async function runPauseCommand(
  options: PauseCommandOptions,
): Promise<ExitCode> {
  const [reason, ...extra] = options.args;
  if (!reason || !reason.trim() || extra.length > 0) {
    return usage(options.output);
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const sessionStore = createSessionStateStore(project.path);
  const doctrineSessionStore = createDoctrineSessionStore(project.path);
  const [{ state: session }, { state: doctrines }] = await Promise.all([
    sessionStore.read(),
    createDoctrineStore(project.path).read(),
  ]);
  const sessionId = session.data.current?.id;
  if (!sessionId) {
    await new WorkLifecycleService(workStore, sessionStore).pause(reason);
    throw new Error("Unreachable lifecycle state");
  }

  const timestamp = (options.now ?? (() => new Date()))();
  const now = () => timestamp;
  const { state: work } = await workStore.read();
  const doctrineSession = new DoctrineSessionService(
    doctrineSessionStore,
    doctrines.data,
    work.data,
    { now },
  );
  await doctrineSession.end(sessionId);

  let result;
  try {
    result = await new WorkLifecycleService(workStore, sessionStore, {
      now,
    }).pause(reason);
  } catch (error) {
    await doctrineSession.resume(sessionId);
    throw error;
  }
  options.output.stdout(
    `Paused ${result.pausedWork.kind} ${result.pausedWork.id}; ended ${result.sessionId}.`,
  );
  return EXIT_CODE.success;
}
