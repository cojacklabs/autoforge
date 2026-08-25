import path from "node:path";

import { inspectProjectAttachment } from "@cojacklabs/autoforge-sdk";

import { initializeProject } from "./init.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";
import { inspectAttachment } from "../workspace/attach-inspection.js";

export interface AttachCommandOptions {
  args: readonly string[];
  output: LogWriter;
  homeDirectory?: string;
}

export async function runAttachCommand(
  options: AttachCommandOptions,
): Promise<ExitCode> {
  const [requestedPath, ...flags] = options.args;
  const dryRun = flags.includes("--dry-run");
  const json = flags.includes("--json");
  if (
    !requestedPath ||
    flags.some((flag) => flag !== "--dry-run" && flag !== "--json") ||
    new Set(flags).size !== flags.length ||
    (json && !dryRun)
  ) {
    options.output.stderr(
      "Usage: autoforge attach <path> [--dry-run [--json]]",
    );
    return EXIT_CODE.usage;
  }

  try {
    const result = await inspectProjectAttachment(() =>
      inspectAttachment(requestedPath, options.homeDirectory),
    );
    const inspection = result.data;
    if (dryRun) {
      options.output.stdout(
        json ? JSON.stringify(result, null, 2) : formatInspection(inspection),
      );
      return inspection.conflicts.length > 0
        ? EXIT_CODE.conflict
        : EXIT_CODE.success;
    }
    if (inspection.conflicts.length > 0) {
      options.output.stderr(inspection.conflicts.join("\n"));
      return EXIT_CODE.conflict;
    }
    const projectRoot = path.resolve(inspection.resolvedRoot);
    const installation = await initializeProject({ projectRoot });
    await new GlobalWorkspaceStore(options.homeDirectory).registerProject(
      projectRoot,
    );
    options.output.stdout(`Attached AutoForge to ${installation.directory}`);
    return EXIT_CODE.success;
  } catch (error) {
    options.output.stderr(
      error instanceof Error
        ? `Unable to attach AutoForge: ${error.message}`
        : "Unable to attach AutoForge to the requested project.",
    );
    return EXIT_CODE.conflict;
  }
}

function formatInspection(
  inspection: Awaited<ReturnType<typeof inspectAttachment>>,
): string {
  return [
    "AutoForge attach dry run",
    `Requested: ${inspection.requestedPath}`,
    `Resolved root: ${inspection.resolvedRoot}`,
    `Repository: ${inspection.repositoryKind}`,
    `Installation: ${inspection.installationStatus}`,
    `Registration: ${inspection.registrationStatus}`,
    `Actions: ${inspection.actions.join(", ") || "none"}`,
    `Conflicts: ${inspection.conflicts.length > 0 ? inspection.conflicts.join(" | ") : "none"}`,
  ].join("\n");
}
