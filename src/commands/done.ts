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

export interface DoneCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
}

export async function runDoneCommand(
  options: DoneCommandOptions,
): Promise<ExitCode> {
  if (options.args.length > 0) {
    options.output.stderr('Command "done" does not accept arguments.');
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const sessionStore = createSessionStateStore(project.path);
  const doctrineSessionStore = createDoctrineSessionStore(project.path);
  const [{ state: work }, { state: session }, { state: doctrines }] =
    await Promise.all([
      workStore.read(),
      sessionStore.read(),
      createDoctrineStore(project.path).read(),
    ]);
  const sessionId = session.data.current?.id;
  if (!sessionId) {
    await new WorkLifecycleService(workStore, sessionStore).complete();
    throw new Error("Unreachable lifecycle state");
  }
  const timestamp = (options.now ?? (() => new Date()))();
  const now = () => timestamp;
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
    }).complete();
  } catch (error) {
    await doctrineSession.resume(sessionId);
    throw error;
  }
  options.output.stdout(
    `Completed ${result.completedWork.kind} ${result.completedWork.id}; ended ${result.sessionId}.`,
  );
  return EXIT_CODE.success;
}
