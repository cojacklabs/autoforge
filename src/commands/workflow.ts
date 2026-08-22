import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { workflowKindSchema } from "../workflows/definitions.js";
import { WorkflowStateStore } from "../workflows/state.js";
import { AgentContractStore } from "../contract/generator.js";
import { workflowHandoffSchema } from "../workflows/handoff.js";
import {
  normalizeWorkflowKind,
  workflowKindHelp,
} from "../core/vocabularies.js";
import { reportCommandError } from "../cli/command-error.js";
import { inputSchemaJson } from "../input-schemas/catalog.js";

export interface WorkflowCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}
function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge workflow list | workflow start <id> <kind> | workflow show <id> | workflow advance <id> [--skip-optional] | workflow handoff <json-file>",
  );
  output.stderr(workflowKindHelp());
  return EXIT_CODE.usage;
}
export async function runWorkflowCommand(
  options: WorkflowCommandOptions,
): Promise<ExitCode> {
  if (
    options.args.length === 2 &&
    options.args[0] === "handoff" &&
    options.args[1] === "--schema"
  ) {
    options.output.stdout(
      JSON.stringify(inputSchemaJson("workflow-handoff"), null, 2),
    );
    return EXIT_CODE.success;
  }
  const [action, id, kind] = options.args;
  const skipOptional = options.args.includes("--skip-optional");
  if (
    !action ||
    (!id && action !== "list") ||
    (action === "start" && !kind) ||
    options.args.length !==
      (action === "list"
        ? 1
        : action === "advance" && skipOptional
          ? 3
          : action === "start"
            ? 3
            : 2)
  )
    return usage(options.output);
  try {
    const project = await discoverProjectRoot({
      startDirectory: options.startDirectory,
    });
    const store = new WorkflowStateStore(project.path);
    if (action === "start") await new AgentContractStore(project.path).read();
    if (action === "list") {
      options.output.stdout(JSON.stringify(await store.list(), null, 2));
      return EXIT_CODE.success;
    }
    if (action === "handoff") {
      const handoffPath = await resolveContainedProjectPath(project.path, id!);
      const handoff = workflowHandoffSchema.parse(
        JSON.parse(await readFile(handoffPath.absolutePath, "utf8")) as unknown,
      );
      await store.writeHandoff(handoff);
      options.output.stdout(
        `Stored handoff ${handoff.workflowId}: ${handoff.fromStage} → ${handoff.toStage}.`,
      );
      return EXIT_CODE.success;
    }
    const normalizedKind = kind ? normalizeWorkflowKind(kind) : undefined;
    if (action === "start" && !normalizedKind) {
      options.output.stderr(`Error: "${kind}" is not a valid workflow kind.`);
      options.output.stderr(workflowKindHelp());
      return EXIT_CODE.usage;
    }
    const run =
      action === "start"
        ? await store.create(id!, workflowKindSchema.parse(normalizedKind))
        : action === "show"
          ? await store.read(id!)
          : action === "advance"
            ? await store.advance(id!, new Date(), skipOptional)
            : undefined;
    if (!run) return usage(options.output);
    options.output.stdout(JSON.stringify(run, null, 2));
    return EXIT_CODE.success;
  } catch (error) {
    return reportCommandError(error, options.output);
  }
}
import { readFile } from "node:fs/promises";
