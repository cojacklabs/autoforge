import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { ExperimentService } from "../learning/experiment-service.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";

export interface LearningExperimentCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text> | experiment list [--status <status>] | experiment show <id> | experiment complete <id>",
  );
  return EXIT_CODE.usage;
}

function parseAddArguments(
  args: readonly string[],
): { hypothesisIds: string[]; method: string } | undefined {
  const hypothesisIds: string[] = [];
  let method: string | undefined;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if ((flag !== "--hypothesis" && flag !== "--method") || !value) {
      return undefined;
    }
    if (flag === "--hypothesis") hypothesisIds.push(value);
    else method = value;
  }
  if (hypothesisIds.length === 0 || !method) return undefined;
  return { hypothesisIds, method };
}

export async function runLearningExperimentCommand(
  options: LearningExperimentCommandOptions,
): Promise<ExitCode> {
  const [action, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const experimentStore = new ExperimentStore(project.path);
  const hypothesisStore = new HypothesisStore(project.path);
  const service = new ExperimentService(experimentStore, hypothesisStore);

  try {
    if (action === "add") {
      const parsed = parseAddArguments(rest);
      if (!parsed) return usage(options.output);
      const result = await service.record(parsed);
      options.output.stdout(
        `Recorded experiment ${result.experiment.id} (revision ${result.revision}).`,
      );
      return EXIT_CODE.success;
    }
    if (action === "list") {
      await experimentStore.ensure();
      const { state } = await experimentStore.state.read();
      const statusFilter = rest[0] === "--status" ? rest[1] : undefined;
      const rows = state.data.experiments
        .filter(
          (experiment) => !statusFilter || experiment.status === statusFilter,
        )
        .map(
          (experiment) =>
            `${experiment.id} [${experiment.status}] — ${experiment.method}`,
        )
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }
    if (action === "show" && rest[0]) {
      await experimentStore.ensure();
      const { state } = await experimentStore.state.read();
      const found = state.data.experiments.find(
        (experiment) => experiment.id === rest[0],
      );
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }
    if (action === "complete" && rest[0] && rest.length === 1) {
      const result = await service.complete(rest[0]);
      options.output.stdout(`Completed experiment ${result.experiment.id}.`);
      return EXIT_CODE.success;
    }
    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      options.output.stderr(
        error.issues[0]?.message ?? "Invalid experiment input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
