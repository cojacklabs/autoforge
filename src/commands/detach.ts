import path from "node:path";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";

export interface DetachCommandOptions {
  args: readonly string[];
  output: LogWriter;
  homeDirectory?: string;
}

export async function runDetachCommand(
  options: DetachCommandOptions,
): Promise<ExitCode> {
  if (options.args.length !== 1) {
    options.output.stderr("Usage: autoforge detach <path>");
    return EXIT_CODE.usage;
  }
  try {
    await new GlobalWorkspaceStore(options.homeDirectory).unregisterProject(
      path.resolve(options.args[0]!),
    );
    options.output.stdout("Detached project from the global registry.");
    return EXIT_CODE.success;
  } catch {
    options.output.stderr("Unable to update the global project registry.");
    return EXIT_CODE.invalidState;
  }
}
