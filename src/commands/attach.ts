import path from "node:path";

import { initializeProject } from "./init.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";

export interface AttachCommandOptions {
  args: readonly string[];
  output: LogWriter;
  homeDirectory?: string;
}

export async function runAttachCommand(
  options: AttachCommandOptions,
): Promise<ExitCode> {
  if (options.args.length !== 1) {
    options.output.stderr("Usage: autoforge attach <path>");
    return EXIT_CODE.usage;
  }

  try {
    const projectRoot = path.resolve(options.args[0]!);
    const installation = await initializeProject({ projectRoot });
    await new GlobalWorkspaceStore(options.homeDirectory).registerProject(
      projectRoot,
    );
    options.output.stdout(`Attached AutoForge to ${installation.directory}`);
    return EXIT_CODE.success;
  } catch {
    options.output.stderr(
      "Unable to attach AutoForge to the requested project.",
    );
    return EXIT_CODE.conflict;
  }
}
