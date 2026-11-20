import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { migrateLegacyProject } from "../migrations/legacy.js";
import { migrateBrand, type BrandMigrationPlan } from "../migrations/brand.js";
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

function formatBrandResult(plan: BrandMigrationPlan): string {
  const actions = plan.artifacts.map(
    ({ action, path }) => `  - ${action}: ${path}`,
  );
  if (plan.status === "planned") {
    return [
      `Brand migration plan: ${plan.sourceDirectory} -> ${plan.targetDirectory}`,
      `Project root: ${plan.projectRoot}`,
      `Planned actions: ${plan.artifacts.length}`,
      ...actions,
      `${plan.sourceDirectory} is removed only after the copy is verified and validated.`,
      "Run 'autoforge migrate brand' to apply migration with recoverable backup.",
    ].join("\n");
  }
  return [
    `Migrated brand state from ${plan.sourceDirectory} to ${plan.targetDirectory}.`,
    `Backup created at: ${plan.backupDirectory}`,
    `Validation: ${plan.validation}`,
    ...actions,
  ].join("\n");
}

export async function runMigrateCommand(
  options: MigrateCommandOptions,
): Promise<ExitCode> {
  const isBrand = options.args[0] === "brand";
  const remainingArgs = isBrand ? options.args.slice(1) : options.args;
  let dryRun = false;
  let json = false;
  for (const argument of remainingArgs) {
    if (argument === "--dry-run") dryRun = true;
    else if (argument === "--json") json = true;
    else {
      options.output.stderr(
        "Usage: autoforge migrate [brand] [--dry-run] [--json]",
      );
      return EXIT_CODE.usage;
    }
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });

  if (isBrand) {
    const plan = await migrateBrand({
      projectRoot: project.path,
      dryRun,
    });
    options.output.stdout(
      json ? JSON.stringify(plan, null, 2) : formatBrandResult(plan),
    );
    return EXIT_CODE.success;
  }

  const result = await migrateLegacyProject({
    projectRoot: project.path,
    dryRun,
  });
  options.output.stdout(
    json ? JSON.stringify(result, null, 2) : formatResult(result),
  );
  return EXIT_CODE.success;
}
