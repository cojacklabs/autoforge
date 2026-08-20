import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { createWorkStateStore } from "../state/kernel.js";
import { workScopeSchema } from "../work/schemas.js";
import { WorkService } from "../work/service.js";

type AddKind = "feature" | "phase" | "task" | "issue";

export interface AddCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

interface ParsedAddArguments {
  kind: AddKind;
  name: string;
  description: string;
  featureId?: string;
  phaseId?: string;
  include: string[];
  exclude: string[];
}

const ADD_KINDS = new Set<AddKind>(["feature", "phase", "task", "issue"]);
const REPEATABLE_FLAGS = new Set(["--include", "--exclude"]);
const SINGLE_FLAGS = new Set([
  "--name",
  "--description",
  "--feature",
  "--phase",
]);

function usageError(output: LogWriter, message: string): undefined {
  output.stderr(message);
  output.stderr('Run "autoforge help" for usage.');
  return undefined;
}

function parseAddArguments(
  args: readonly string[],
  output: LogWriter,
): ParsedAddArguments | undefined {
  const [kindValue, ...tokens] = args;
  if (!kindValue || !ADD_KINDS.has(kindValue as AddKind)) {
    return usageError(
      output,
      "Expected add kind: feature, phase, task, or issue.",
    );
  }
  const kind = kindValue as AddKind;
  const singleValues = new Map<string, string>();
  const repeatableValues = new Map<string, string[]>([
    ["--include", []],
    ["--exclude", []],
  ]);

  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];
    if (!flag || (!SINGLE_FLAGS.has(flag) && !REPEATABLE_FLAGS.has(flag))) {
      return usageError(output, `Unknown add option: ${flag ?? "<missing>"}`);
    }
    if (!value || value.startsWith("--")) {
      return usageError(output, `Option ${flag} requires a value.`);
    }
    if (SINGLE_FLAGS.has(flag)) {
      if (singleValues.has(flag)) {
        return usageError(output, `Option ${flag} may only be provided once.`);
      }
      singleValues.set(flag, value);
    } else {
      repeatableValues.get(flag)?.push(value);
    }
  }

  const name = singleValues.get("--name");
  const description = singleValues.get("--description");
  if (!name || !description) {
    return usageError(output, "Options --name and --description are required.");
  }

  const featureId = singleValues.get("--feature");
  const phaseId = singleValues.get("--phase");
  const include = repeatableValues.get("--include") ?? [];
  const exclude = repeatableValues.get("--exclude") ?? [];
  if (kind === "phase" && !featureId) {
    return usageError(output, "Option --feature is required for a phase.");
  }
  if (kind === "task" && !phaseId) {
    return usageError(output, "Option --phase is required for a task.");
  }
  if ((kind === "task" || kind === "issue") && include.length === 0) {
    return usageError(
      output,
      `At least one --include scope is required for a ${kind}.`,
    );
  }
  if (
    (kind !== "phase" && featureId) ||
    (kind !== "task" && phaseId) ||
    ((kind === "feature" || kind === "phase") &&
      (include.length > 0 || exclude.length > 0))
  ) {
    return usageError(output, `One or more options do not apply to ${kind}.`);
  }

  return {
    kind,
    name,
    description,
    ...(featureId ? { featureId } : {}),
    ...(phaseId ? { phaseId } : {}),
    include,
    exclude,
  };
}

export async function runAddCommand(
  options: AddCommandOptions,
): Promise<ExitCode> {
  const parsed = parseAddArguments(options.args, options.output);
  if (!parsed) {
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const service = new WorkService(createWorkStateStore(project.path));

  try {
    let result;
    switch (parsed.kind) {
      case "feature":
        result = await service.createFeature(parsed);
        break;
      case "phase":
        result = await service.createPhase({
          featureId: parsed.featureId!,
          name: parsed.name,
          description: parsed.description,
        });
        break;
      case "task":
        result = await service.createTask({
          phaseId: parsed.phaseId!,
          name: parsed.name,
          description: parsed.description,
          scope: workScopeSchema.parse({
            include: parsed.include,
            exclude: parsed.exclude,
          }),
        });
        break;
      case "issue":
        result = await service.createIssue({
          name: parsed.name,
          description: parsed.description,
          scope: workScopeSchema.parse({
            include: parsed.include,
            exclude: parsed.exclude,
          }),
        });
        break;
    }
    options.output.stdout(
      `Added ${parsed.kind} ${result.entity.id} (revision ${result.revision}).`,
    );
    return EXIT_CODE.success;
  } catch (error) {
    if (error instanceof z.ZodError) {
      usageError(
        options.output,
        error.issues[0]?.message ?? "Invalid work input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
