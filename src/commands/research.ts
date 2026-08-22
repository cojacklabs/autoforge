import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import { discoverProjectRoot } from "../core/project.js";
import { registerKnowledgeSpecification } from "./knowledge.js";
import type { IntentCommandOptions } from "./intent.js";
import { inputSchemaJson } from "../input-schemas/catalog.js";
import { reportCommandError } from "../cli/command-error.js";

export type ResearchCommandOptions = IntentCommandOptions;

function usage(output: ResearchCommandOptions["output"]): ExitCode {
  output.stderr("Usage: autoforge research register <json-file>");
  return EXIT_CODE.usage;
}

export async function runResearchCommand(
  options: ResearchCommandOptions,
): Promise<ExitCode> {
  if (
    options.args.length === 2 &&
    options.args[0] === "register" &&
    options.args[1] === "--schema"
  ) {
    options.output.stdout(
      JSON.stringify(inputSchemaJson("research-register"), null, 2),
    );
    return EXIT_CODE.success;
  }
  if (options.args[0] !== "register") {
    return usage(options.output);
  }
  const file = options.args[1];
  if (!file || options.args.length !== 2) return usage(options.output);
  try {
    const project = await discoverProjectRoot({
      startDirectory: options.startDirectory,
    });
    const result = await registerKnowledgeSpecification(
      project.path,
      file,
      "research",
    );
    options.output.stdout(`Registered ${result.id} to ${result.path}`);
    return EXIT_CODE.success;
  } catch (error) {
    return reportCommandError(error, options.output);
  }
}
