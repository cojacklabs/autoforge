import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { inspectBootstrap } from "../bootstrap/inspect.js";

export async function runBootstrapCommand(options: {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}): Promise<ExitCode> {
  if (options.args.length !== 1 || options.args[0] !== "inspect") {
    options.output.stderr("Usage: autoforge bootstrap inspect");
    return EXIT_CODE.usage;
  }
  try {
    const report = await inspectBootstrap(options.startDirectory);
    options.output.stdout(JSON.stringify(report, null, 2));
    return EXIT_CODE.success;
  } catch {
    options.output.stderr("Unable to inspect project bootstrap readiness.");
    return EXIT_CODE.notFound;
  }
}
