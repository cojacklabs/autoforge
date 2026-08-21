import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { workflowKindSchema } from "../workflows/definitions.js";
import { WorkflowStateStore } from "../workflows/state.js";

export interface WorkflowCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}
function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge workflow start <id> <kind> | workflow show <id> | workflow advance <id>",
  );
  return EXIT_CODE.usage;
}
export async function runWorkflowCommand(
  options: WorkflowCommandOptions,
): Promise<ExitCode> {
  const [action, id, kind] = options.args;
  if (
    !action ||
    !id ||
    (action === "start" && !kind) ||
    options.args.length > (action === "start" ? 3 : 2)
  )
    return usage(options.output);
  try {
    const project = await discoverProjectRoot({
      startDirectory: options.startDirectory,
    });
    const store = new WorkflowStateStore(project.path);
    const run =
      action === "start"
        ? await store.create(id, workflowKindSchema.parse(kind))
        : action === "show"
          ? await store.read(id)
          : action === "advance"
            ? await store.advance(id)
            : undefined;
    if (!run) return usage(options.output);
    options.output.stdout(JSON.stringify(run, null, 2));
    return EXIT_CODE.success;
  } catch {
    return usage(options.output);
  }
}
