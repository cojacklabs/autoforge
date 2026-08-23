import { z } from "zod";

import { createDecisionStore } from "../decisions/store.js";
import { DecisionService } from "../decisions/service.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { EvidenceService } from "../learning/evidence-service.js";
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
import { createWorkStateStore } from "../state/kernel.js";

export interface DecideCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

interface ParsedDecideArguments {
  statement: string;
  reasoning: string;
  consequences: string[];
  scope: string[];
  keywords: string[];
  relatedWork: string[];
  evidence: string[];
  supersedes?: string;
  kind?: string;
}

const SINGLE_FLAGS = new Set([
  "--statement",
  "--reasoning",
  "--supersedes",
  "--kind",
]);
const REPEATABLE_FLAGS = new Set([
  "--consequence",
  "--scope",
  "--keyword",
  "--work",
  "--evidence",
]);

function usageError(output: LogWriter, message: string): undefined {
  output.stderr(message);
  output.stderr('Run "autoforge help" for usage.');
  return undefined;
}

function parseDecideArguments(
  args: readonly string[],
  output: LogWriter,
): ParsedDecideArguments | undefined {
  const singleValues = new Map<string, string>();
  const repeatableValues = new Map<string, string[]>(
    [...REPEATABLE_FLAGS].map((flag) => [flag, []]),
  );
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || (!SINGLE_FLAGS.has(flag) && !REPEATABLE_FLAGS.has(flag))) {
      return usageError(
        output,
        `Unknown decide option: ${flag ?? "<missing>"}`,
      );
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

  const statement = singleValues.get("--statement");
  const reasoning = singleValues.get("--reasoning");
  const consequences = repeatableValues.get("--consequence") ?? [];
  const scope = repeatableValues.get("--scope") ?? [];
  const keywords = repeatableValues.get("--keyword") ?? [];
  if (!statement || !reasoning) {
    return usageError(
      output,
      "Options --statement and --reasoning are required.",
    );
  }
  if (
    consequences.length === 0 ||
    scope.length === 0 ||
    keywords.length === 0
  ) {
    return usageError(
      output,
      "At least one --consequence, --scope, and --keyword is required.",
    );
  }

  const KNOWN_KINDS = new Set([
    "architecture",
    "bugfix",
    "feature-note",
    "skip-reason",
  ]);

  const supersedes = singleValues.get("--supersedes");
  const kind = singleValues.get("--kind");
  if (kind !== undefined && !KNOWN_KINDS.has(kind)) {
    return usageError(
      output,
      `Option --kind must be one of: ${[...KNOWN_KINDS].join(", ")}.`,
    );
  }
  return {
    statement,
    reasoning,
    consequences,
    scope,
    keywords,
    relatedWork: repeatableValues.get("--work") ?? [],
    evidence: repeatableValues.get("--evidence") ?? [],
    ...(supersedes ? { supersedes } : {}),
    ...(kind ? { kind } : {}),
  };
}

export async function runDecideCommand(
  options: DecideCommandOptions,
): Promise<ExitCode> {
  const parsed = parseDecideArguments(options.args, options.output);
  if (!parsed) {
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const service = new DecisionService(
    createDecisionStore(project.path),
    createWorkStateStore(project.path),
    {
      evidenceService: new EvidenceService(
        new EvidenceStore(project.path),
        new ExperimentStore(project.path),
        new HypothesisStore(project.path),
      ),
    },
  );
  try {
    const { kind, ...rest } = parsed;
    const result = await service.record({
      ...rest,
      ...(kind
        ? { kind: kind as import("../decisions/schemas.js").DecisionKind }
        : {}),
    });
    options.output.stdout(
      `Recorded decision ${result.decision.id} (revision ${result.revision}).`,
    );
    return EXIT_CODE.success;
  } catch (error) {
    if (error instanceof z.ZodError) {
      usageError(
        options.output,
        error.issues[0]?.message ?? "Invalid decision input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
