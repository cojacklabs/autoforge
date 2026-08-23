import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { evidenceKindSchema } from "../learning/evidence-schemas.js";
import { EvidenceService } from "../learning/evidence-service.js";
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
import { createWorkStateStore } from "../state/kernel.js";

export interface LearningEvidenceCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <id>] | evidence list [--kind <kind>] | evidence show <id>",
  );
  return EXIT_CODE.usage;
}

const SINGLE_FLAGS = new Set([
  "--kind",
  "--summary",
  "--source",
  "--experiment",
  "--hypothesis",
  "--work",
]);

function parseAddArguments(
  args: readonly string[],
): Map<string, string> | undefined {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !SINGLE_FLAGS.has(flag) || !value || value.startsWith("--")) {
      return undefined;
    }
    values.set(flag, value);
  }
  return values;
}

export async function runLearningEvidenceCommand(
  options: LearningEvidenceCommandOptions,
): Promise<ExitCode> {
  const [action, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const evidenceStore = new EvidenceStore(project.path);
  const experimentStore = new ExperimentStore(project.path);
  const hypothesisStore = new HypothesisStore(project.path);
  const service = new EvidenceService(
    evidenceStore,
    experimentStore,
    hypothesisStore,
    createWorkStateStore(project.path),
  );

  try {
    if (action === "add") {
      const flags = parseAddArguments(rest);
      const kind = flags?.get("--kind");
      const summary = flags?.get("--summary");
      const source = flags?.get("--source");
      if (!flags || !kind || !summary || !source) return usage(options.output);
      const parsedKind = evidenceKindSchema.parse(kind);
      const experimentId = flags.get("--experiment");
      const hypothesisId = flags.get("--hypothesis");
      const relatedWork = flags.get("--work");
      if (!experimentId && !hypothesisId && !relatedWork) {
        return usage(options.output);
      }
      const result = await service.record({
        kind: parsedKind,
        summary,
        source,
        ...(experimentId ? { experimentId } : {}),
        ...(hypothesisId ? { hypothesisId } : {}),
        ...(relatedWork ? { relatedWork } : {}),
      });
      options.output.stdout(
        `Recorded evidence ${result.evidence.id} (revision ${result.revision}).`,
      );
      return EXIT_CODE.success;
    }
    if (action === "list") {
      await evidenceStore.ensure();
      const { state } = await evidenceStore.state.read();
      const kindFilter = rest[0] === "--kind" ? rest[1] : undefined;
      const rows = state.data.evidence
        .filter((record) => !kindFilter || record.kind === kindFilter)
        .map((record) => `${record.id} [${record.kind}] — ${record.summary}`)
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }
    if (action === "show" && rest[0]) {
      await evidenceStore.ensure();
      const { state } = await evidenceStore.state.read();
      const found = state.data.evidence.find((record) => record.id === rest[0]);
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }
    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      options.output.stderr(
        error.issues[0]?.message ?? "Invalid evidence input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
