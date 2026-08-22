import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { DecisionService } from "../decisions/service.js";
import { createDecisionStore } from "../decisions/store.js";
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

function parseDoneArguments(
  args: readonly string[],
  output: LogWriter,
): { noDecisionReason?: string } | undefined {
  if (args.length === 0) {
    return {};
  }
  if (args.length === 2 && args[0] === "--no-decision" && args[1]?.trim()) {
    return { noDecisionReason: args[1] };
  }
  output.stderr(
    'Command "done" only accepts --no-decision "<reason>", or no arguments.',
  );
  return undefined;
}

export async function runDoneCommand(
  options: DoneCommandOptions,
): Promise<ExitCode> {
  const parsedArgs = parseDoneArguments(options.args, options.output);
  if (!parsedArgs) {
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

  const activeWork = work.data.activeWork;
  if (
    activeWork &&
    (activeWork.kind === "issue" || activeWork.kind === "task")
  ) {
    const decisionStore = createDecisionStore(project.path);
    const { state: decisionMemory } = await decisionStore.read();
    const hasLinkedDecision = decisionMemory.data.decisions.some((decision) =>
      decision.relatedWork.includes(activeWork.id),
    );
    if (!hasLinkedDecision) {
      if (parsedArgs.noDecisionReason) {
        await new DecisionService(decisionStore, workStore).record({
          statement: `Skipped documentation for ${activeWork.id}`,
          reasoning: parsedArgs.noDecisionReason,
          consequences: [
            `${activeWork.id} was closed without a linked decision.`,
          ],
          scope: [activeWork.kind],
          keywords: ["skip-reason"],
          relatedWork: [activeWork.id],
          kind: "skip-reason",
        });
      } else {
        options.output.stderr(
          `No decision is linked to ${activeWork.id}. Run 'autoforge decide ... --work ${activeWork.id}' before closing this ${activeWork.kind}, or pass --no-decision "<reason>" to bypass.`,
        );
        return EXIT_CODE.invalidState;
      }
    }
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
