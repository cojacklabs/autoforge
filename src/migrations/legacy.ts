import { randomUUID } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { initializeProject, inspectInstallation } from "../commands/init.js";
import {
  parseConfig,
  qualityGateCommandSchema,
  type QualityGateCommand,
} from "../core/config.js";
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import {
  legacyMigrationPlanSchema,
  legacyMigrationResultSchema,
  legacyVersionSchema,
  type LegacyMigrationPlan,
  type LegacyMigrationResult,
  type MigrationArtifact,
} from "./schemas.js";

const LEGACY_PACKAGE_NAME = "@cojacklabs/autoforge";
const SIMPLE_COMMAND_TOKEN = /^[A-Za-z0-9@%+=:,./_-]+$/;
const LEGACY_AUTOFORGE_IGNORES = new Set([".autoforge/", "/.autoforge/"]);
const MIGRATION_GITIGNORE_RULES = [
  ".autoforge.backup-*/",
  ".autoforge/context/",
  ".autoforge/state/session.json",
  ".autoforge/state/doctrine-session.json",
  ".autoforge/state/*.json.bak",
] as const;

const legacyPackageSchema = z
  .object({
    name: z.literal(LEGACY_PACKAGE_NAME),
    version: legacyVersionSchema,
  })
  .passthrough();

const optionalCommandSchema = z
  .object({
    cmd: z.string().trim().min(1).optional(),
    cmdCheck: z.string().trim().min(1).optional(),
  })
  .passthrough();

const legacyConfigSchema = z
  .object({
    qualityPolicies: z
      .object({
        typecheck: optionalCommandSchema.optional(),
        lint: optionalCommandSchema.optional(),
        format: optionalCommandSchema.optional(),
        tests: optionalCommandSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export interface LegacyMigrationOptions {
  projectRoot: string;
  dryRun?: boolean;
  now?: () => Date;
  projectId?: string;
  temporaryId?: () => string;
}

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await lstat(candidatePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readJson(candidatePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(candidatePath, "utf8"));
  } catch (error) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Unable to parse legacy JSON at ${candidatePath}`,
      {
        cause: error,
        details: { path: candidatePath },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }
}

async function readOptionalText(
  candidatePath: string,
): Promise<string | undefined> {
  try {
    return await readFile(candidatePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function withMigrationGitignorePolicy(content: string | undefined): string {
  const lines = (content?.split(/\r?\n/) ?? []).filter(
    (line) => !LEGACY_AUTOFORGE_IGNORES.has(line.trim()),
  );
  while (lines.at(-1)?.trim() === "") lines.pop();
  const existing = new Set(lines);
  for (const rule of MIGRATION_GITIGNORE_RULES) {
    if (!existing.has(rule)) lines.push(rule);
  }
  return `${lines.join("\n").replace(/\s+$/, "")}\n`;
}

async function atomicWriteText(
  destinationPath: string,
  content: string,
  temporaryPath: string,
): Promise<void> {
  try {
    const handle = await open(temporaryPath, "wx");
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, destinationPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function listFiles(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(
        ...(await listFiles(path.join(directory, entry.name), relativePath)),
      );
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

function parseSimpleCommand(
  id: string,
  value: string | undefined,
): QualityGateCommand | undefined {
  if (!value) return undefined;
  const tokens = value.split(/\s+/);
  if (
    tokens.length === 0 ||
    tokens.some((token) => !SIMPLE_COMMAND_TOKEN.test(token))
  ) {
    return undefined;
  }
  const [command, ...args] = tokens;
  if (!command) return undefined;
  return qualityGateCommandSchema.parse({
    id,
    command,
    args,
    timeoutMs: 120_000,
  });
}

async function legacyQualityGates(projectRoot: string): Promise<{
  artifacts: MigrationArtifact[];
  qualityGates: QualityGateCommand[];
}> {
  const configPath = path.join(projectRoot, "autoforge.config.json");
  if (!(await pathExists(configPath)))
    return { artifacts: [], qualityGates: [] };
  const config = legacyConfigSchema.parse(await readJson(configPath));
  const candidates = [
    ["typecheck", config.qualityPolicies?.typecheck?.cmd],
    ["lint", config.qualityPolicies?.lint?.cmd],
    ["format", config.qualityPolicies?.format?.cmdCheck],
    ["tests", config.qualityPolicies?.tests?.cmd],
  ] as const;
  const qualityGates: QualityGateCommand[] = [];
  const artifacts: MigrationArtifact[] = [];
  for (const [id, commandText] of candidates) {
    if (!commandText) continue;
    const command = parseSimpleCommand(id, commandText);
    if (command) {
      qualityGates.push(command);
      artifacts.push({
        path: `autoforge.config.json#qualityPolicies.${id}`,
        outcome: "migrated",
        reason: `Converted to quality gate ${id}.`,
      });
    } else {
      artifacts.push({
        path: `autoforge.config.json#qualityPolicies.${id}`,
        outcome: "skipped",
        reason: "Command requires shell parsing and cannot be migrated safely.",
      });
    }
  }
  return { artifacts, qualityGates };
}

export async function planLegacyMigration(
  projectRoot: string,
): Promise<LegacyMigrationPlan> {
  const root = path.resolve(projectRoot);
  const inspection = await inspectInstallation(root);
  if (inspection.status !== "legacy") {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Legacy migration requires a legacy installation; found ${inspection.status}.`,
      {
        details: { status: inspection.status, path: inspection.directory },
        exitCode:
          inspection.status === "current"
            ? EXIT_CODE.conflict
            : EXIT_CODE.invalidState,
      },
    );
  }
  const packagePath = path.join(inspection.directory, "package.json");
  if (!(await pathExists(packagePath))) {
    throw new AutoForgeError(
      "INVALID_STATE",
      "Legacy AutoForge version could not be detected; no files were changed.",
      {
        details: { path: packagePath },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }
  const legacyPackage = legacyPackageSchema.safeParse(
    await readJson(packagePath),
  );
  if (!legacyPackage.success) {
    throw new AutoForgeError(
      "INVALID_STATE",
      "Unsupported legacy AutoForge package metadata; no files were changed.",
      {
        details: { path: packagePath, issues: legacyPackage.error.issues },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }
  const quality = await legacyQualityGates(root);
  const artifacts: MigrationArtifact[] = [
    {
      path: ".autoforge/package.json#version",
      outcome: "migrated",
      reason: `Detected AutoForge ${legacyPackage.data.version}.`,
    },
    ...quality.artifacts,
    ...(await listFiles(inspection.directory))
      .filter((relativePath) => relativePath !== "package.json")
      .map((relativePath) => ({
        path: `.autoforge/${relativePath}`,
        outcome: "skipped" as const,
        reason:
          "Preserved in the complete legacy backup; no safe automatic 0.7 mapping exists.",
      })),
  ];
  return legacyMigrationPlanSchema.parse({
    sourceVersion: legacyPackage.data.version,
    sourceDirectory: inspection.directory,
    artifacts,
    qualityGates: quality.qualityGates,
  });
}

function safeId(value: string): string {
  if (!/^[A-Za-z0-9-]+$/.test(value)) {
    throw new AutoForgeError(
      "INVALID_ARGUMENT",
      "Migration temporary IDs must contain only letters, numbers, and hyphens.",
      { exitCode: EXIT_CODE.usage },
    );
  }
  return value;
}

export async function migrateLegacyProject(
  options: LegacyMigrationOptions,
): Promise<LegacyMigrationResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const plan = await planLegacyMigration(projectRoot);
  if (options.dryRun) {
    return legacyMigrationResultSchema.parse({
      status: "planned",
      sourceVersion: plan.sourceVersion,
      backupDirectory: null,
      artifacts: plan.artifacts,
      validation: "not-run",
    });
  }

  const temporaryId = options.temporaryId ?? randomUUID;
  const operationId = safeId(temporaryId());
  const lockPath = path.join(projectRoot, ".autoforge.init.lock");
  const stagingRoot = path.join(
    projectRoot,
    `.autoforge.migrate-${operationId}`,
  );
  const displacedLegacy = path.join(stagingRoot, "legacy-source");
  const backupDirectory = path.join(
    projectRoot,
    `.autoforge.backup-${operationId}`,
  );
  const targetDirectory = path.join(projectRoot, ".autoforge");
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const gitignoreTemporaryPath = path.join(
    projectRoot,
    `.gitignore.migrate-${operationId}.tmp`,
  );
  let lockHandle: FileHandle | undefined;
  let stagingCreated = false;
  let backupStarted = false;
  let backupComplete = false;
  let legacyDisplaced = false;
  let currentPublished = false;
  let gitignoreUpdated = false;
  let originalGitignore: string | undefined;

  try {
    try {
      lockHandle = await open(lockPath, "wx");
      await lockHandle.writeFile(`${process.pid}\n`, "utf8");
      await lockHandle.sync();
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw new AutoForgeError(
          "STATE_CONFLICT",
          "Another AutoForge initialization or migration is in progress.",
          { exitCode: EXIT_CODE.conflict },
        );
      }
      throw error;
    }

    const lockedPlan = await planLegacyMigration(projectRoot);
    if (JSON.stringify(lockedPlan) !== JSON.stringify(plan)) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        "Legacy installation changed while migration was being prepared; no files were changed.",
        { exitCode: EXIT_CODE.conflict },
      );
    }
    if (await pathExists(backupDirectory)) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Migration backup already exists at ${backupDirectory}.`,
        { exitCode: EXIT_CODE.conflict },
      );
    }

    await mkdir(stagingRoot, { recursive: false });
    stagingCreated = true;
    await initializeProject({
      projectRoot: stagingRoot,
      ...(options.projectId ? { projectId: options.projectId } : {}),
      ...(options.now ? { now: options.now } : {}),
      temporaryId,
    });
    const stagedConfigPath = path.join(
      stagingRoot,
      ".autoforge",
      "config.json",
    );
    const stagedConfig = parseConfig(await readJson(stagedConfigPath));
    await writeFile(
      stagedConfigPath,
      `${JSON.stringify(parseConfig({ ...stagedConfig, qualityGates: plan.qualityGates }), null, 2)}\n`,
      "utf8",
    );
    if ((await inspectInstallation(stagingRoot)).status !== "current") {
      throw new AutoForgeError(
        "INVALID_STATE",
        "Staged 0.7 installation failed validation; no files were changed.",
        { exitCode: EXIT_CODE.invalidState },
      );
    }

    originalGitignore = await readOptionalText(gitignorePath);
    const updatedGitignore = withMigrationGitignorePolicy(originalGitignore);
    if (updatedGitignore !== originalGitignore) {
      await atomicWriteText(
        gitignorePath,
        updatedGitignore,
        gitignoreTemporaryPath,
      );
      gitignoreUpdated = true;
    }

    backupStarted = true;
    await cp(targetDirectory, backupDirectory, {
      recursive: true,
      errorOnExist: true,
      force: false,
      verbatimSymlinks: true,
    });
    backupComplete = true;
    await rename(targetDirectory, displacedLegacy);
    legacyDisplaced = true;
    await rename(path.join(stagingRoot, ".autoforge"), targetDirectory);
    currentPublished = true;
    if ((await inspectInstallation(projectRoot)).status !== "current") {
      throw new AutoForgeError(
        "INVALID_STATE",
        "Published 0.7 installation failed validation; the legacy installation will be restored.",
        { exitCode: EXIT_CODE.invalidState },
      );
    }
    await rm(displacedLegacy, { recursive: true, force: true });
    legacyDisplaced = false;
    return legacyMigrationResultSchema.parse({
      status: "migrated",
      sourceVersion: plan.sourceVersion,
      backupDirectory,
      artifacts: plan.artifacts,
      validation: "current",
    });
  } catch (error) {
    if (currentPublished) {
      await rm(targetDirectory, { recursive: true, force: true });
      currentPublished = false;
    }
    if (legacyDisplaced) {
      await rename(displacedLegacy, targetDirectory);
      legacyDisplaced = false;
    }
    if (backupStarted && !backupComplete) {
      await rm(backupDirectory, { recursive: true, force: true });
    }
    if (gitignoreUpdated) {
      if (originalGitignore === undefined) {
        await rm(gitignorePath, { force: true });
      } else {
        await atomicWriteText(
          gitignorePath,
          originalGitignore,
          gitignoreTemporaryPath,
        );
      }
    }
    throw error;
  } finally {
    if (stagingCreated) {
      await rm(stagingRoot, { recursive: true, force: true });
    }
    if (lockHandle) {
      await lockHandle.close();
      await rm(lockPath, { force: true });
    }
  }
}
