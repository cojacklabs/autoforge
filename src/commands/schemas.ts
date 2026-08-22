import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { inputSchemaJson, listInputSchemas } from "../input-schemas/catalog.js";
import { reportCommandError } from "../cli/command-error.js";

export async function runSchemasCommand(options: {
  args: readonly string[];
  output: LogWriter;
}): Promise<ExitCode> {
  const [action, id] = options.args;
  if (action === "list" && options.args.length === 1) {
    options.output.stdout(listInputSchemas().join("\n"));
    return EXIT_CODE.success;
  }
  if (action === "show" && id && options.args.length === 2) {
    try {
      options.output.stdout(JSON.stringify(inputSchemaJson(id), null, 2));
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  options.output.stderr("Usage: autoforge schemas list | schemas show <id>");
  return EXIT_CODE.usage;
}
