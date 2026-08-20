import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { migrateLegacyProject } from "../migrations/legacy.js";
import type { LegacyMigrationResult } from "../migrations/schemas.js";

export interface MigrateCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function formatResult(result: LegacyMigrationResult): string {
  const migrated = result.artifacts.filter(
    ({ outcome }) => outcome === "migrated",
  );
  const skipped = result.artifacts.filter(
    ({ outcome }) => outcome === "skipped",
  );
  const lines = [
    result.status === "planned"
      ? `AutoForge ${result.sourceVersion} migration plan`
      : `Migrated AutoForge ${result.sourceVersion} to the 0.7 state model.`,
    `Migrated artifacts: ${migrated.length}`,
    `Skipped artifacts: ${skipped.length}`,
    result.backupDirectory
      ? `Backup: ${result.backupDirectory}`
      : "Backup: will be created during migration",
    `Validation: ${result.validation}`,
  ];
  if (skipped.length > 0) {
    lines.push(
      "Skipped details:",
      ...skipped.slice(0, 20).map(({ path, reason }) => `- ${path}: ${reason}`),
    );
    if (skipped.length > 20) {
      lines.push(`- ... ${skipped.length - 20} additional artifact(s)`);
    }
  }
  return lines.join("\n");
}

export async function runMigrateCommand(
  options: MigrateCommandOptions,
): Promise<ExitCode> {
  let dryRun = false;
  let json = false;
  for (const argument of options.args) {
    if (argument === "--dry-run") dryRun = true;
    else if (argument === "--json") json = true;
    else {
      options.output.stderr("Usage: autoforge migrate [--dry-run] [--json]");
      return EXIT_CODE.usage;
    }
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const result = await migrateLegacyProject({
    projectRoot: project.path,
    dryRun,
  });
  options.output.stdout(
    json ? JSON.stringify(result, null, 2) : formatResult(result),
  );
  return EXIT_CODE.success;
}
