import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { HypothesisService } from "../learning/hypothesis-service.js";
import { hypothesisStatusSchema } from "../learning/hypothesis-schemas.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
import { createWorkStateStore } from "../state/kernel.js";

export interface LearningHypothesisCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <id>] | hypothesis list [--status <status>] | hypothesis show <id> | hypothesis status <id> --status <proposed|testing|confirmed|refuted>",
  );
  return EXIT_CODE.usage;
}

function parseFlags(
  args: readonly string[],
  known: ReadonlySet<string>,
): Map<string, string> | undefined {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !known.has(flag) || !value || value.startsWith("--")) {
      return undefined;
    }
    values.set(flag, value);
  }
  return values;
}

export async function runLearningHypothesisCommand(
  options: LearningHypothesisCommandOptions,
): Promise<ExitCode> {
  const [action, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const hypothesisStore = new HypothesisStore(project.path);
  const service = new HypothesisService(
    hypothesisStore,
    createWorkStateStore(project.path),
  );

  try {
    if (action === "add") {
      const flags = parseFlags(
        rest,
        new Set([
          "--statement",
          "--expected-outcome",
          "--metric",
          "--target",
          "--work",
        ]),
      );
      const statement = flags?.get("--statement");
      const expectedOutcome = flags?.get("--expected-outcome");
      const metric = flags?.get("--metric");
      const target = flags?.get("--target");
      if (!flags || !statement || !expectedOutcome || !metric || !target) {
        return usage(options.output);
      }
      const linkedFeature = flags.get("--work");
      const result = await service.record({
        statement,
        expectedOutcome,
        metric,
        target,
        ...(linkedFeature ? { linkedFeature } : {}),
      });
      options.output.stdout(
        `Recorded hypothesis ${result.hypothesis.id} (revision ${result.revision}).`,
      );
      return EXIT_CODE.success;
    }
    if (action === "list") {
      await hypothesisStore.ensure();
      const { state } = await hypothesisStore.state.read();
      const statusFilter = rest[0] === "--status" ? rest[1] : undefined;
      const rows = state.data.hypotheses
        .filter(
          (hypothesis) => !statusFilter || hypothesis.status === statusFilter,
        )
        .map(
          (hypothesis) =>
            `${hypothesis.id} [${hypothesis.status}] — ${hypothesis.statement}`,
        )
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }
    if (action === "show" && rest[0]) {
      await hypothesisStore.ensure();
      const { state } = await hypothesisStore.state.read();
      const found = state.data.hypotheses.find(
        (hypothesis) => hypothesis.id === rest[0],
      );
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }
    if (action === "status" && rest[0] === undefined) {
      return usage(options.output);
    }
    if (action === "status") {
      const [id, flag, statusValue] = rest;
      if (flag !== "--status" || !statusValue) return usage(options.output);
      const status = hypothesisStatusSchema.parse(statusValue);
      const result = await service.setStatus(id!, status);
      options.output.stdout(
        `Updated hypothesis ${result.hypothesis.id} to ${result.hypothesis.status}.`,
      );
      return EXIT_CODE.success;
    }
    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      options.output.stderr(
        error.issues[0]?.message ?? "Invalid hypothesis input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
