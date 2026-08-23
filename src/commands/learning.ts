import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { runLearningEvidenceCommand } from "./learning-evidence.js";
import { runLearningExperimentCommand } from "./learning-experiment.js";
import { runLearningHypothesisCommand } from "./learning-hypothesis.js";

export interface LearningCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge learning hypothesis|experiment|evidence <subcommand> ...",
  );
  return EXIT_CODE.usage;
}

export async function runLearningCommand(
  options: LearningCommandOptions,
): Promise<ExitCode> {
  const [domain, ...rest] = options.args;
  const commandOptions = {
    args: rest,
    output: options.output,
    startDirectory: options.startDirectory,
  };
  if (domain === "hypothesis") {
    return runLearningHypothesisCommand(commandOptions);
  }
  if (domain === "experiment") {
    return runLearningExperimentCommand(commandOptions);
  }
  if (domain === "evidence") {
    return runLearningEvidenceCommand(commandOptions);
  }
  return usage(options.output);
}
