import { randomUUID } from "node:crypto";
import {
  cp,
  lstat,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { inspectInstallation } from "../commands/init.js";
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { FRAMEWORK_IDENTITY } from "../core/vocabularies.js";

export const brandMigrationPlanSchema = z
  .object({
    status: z.enum(["planned", "migrated"]),
    sourceDirectory: z.literal(FRAMEWORK_IDENTITY.current.stateDirectory),
    targetDirectory: z.literal(FRAMEWORK_IDENTITY.successor.stateDirectory),
    projectRoot: z.string(),
    backupDirectory: z.string().nullable(),
    artifacts: z.array(
      z.object({
        path: z.string(),
        action: z.enum(["copied", "migrated", "removed"]),
      }),
    ),
    validation: z.enum(["not-run", "valid"]),
  })
  .strict();

export type BrandMigrationPlan = z.infer<typeof brandMigrationPlanSchema>;

export interface BrandMigrationOptions {
  projectRoot: string;
  dryRun?: boolean;
  now?: () => Date;
  temporaryId?: () => string;
}

const SOURCE_NAME = FRAMEWORK_IDENTITY.current.stateDirectory;
const TARGET_NAME = FRAMEWORK_IDENTITY.successor.stateDirectory;
const BACKUP_IGNORE_RULE = `${SOURCE_NAME}.backup-*/`;

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readOptionalText(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/** Maps every file under a directory to its size, keyed by relative path. */
async function listTree(
  directory: string,
  prefix = "",
  into = new Map<string, number>(),
): Promise<Map<string, number>> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await listTree(absolute, relative, into);
    } else {
      into.set(relative, (await stat(absolute)).size);
    }
  }
  return into;
}

/**
 * Returns the .gitignore text with the `.autoforge/` rules mirrored for
 * `.priozar/`, or undefined when nothing needs adding. Without the mirror,
 * runtime state such as sessions and context packets would start showing up
 * as untracked files once the directory is renamed.
 */
export function mirrorGitignoreRules(content: string): string | undefined {
  const lines = content.split(/\r?\n/);
  const existing = new Set(lines.map((line) => line.trim()));
  const additions: string[] = [];
  const add = (rule: string): void => {
    if (!existing.has(rule) && !additions.includes(rule)) additions.push(rule);
  };
  for (const line of lines) {
    const trimmed = line.trim();
    const negated = trimmed.startsWith("!");
    const body = negated ? trimmed.slice(1) : trimmed;
    if (
      body.startsWith(`${SOURCE_NAME}/`) ||
      body.startsWith(`/${SOURCE_NAME}/`)
    ) {
      const mirrored = body.replace(SOURCE_NAME, TARGET_NAME);
      add(negated ? `!${mirrored}` : mirrored);
    }
  }
  if (lines.some((line) => line.trim() === BACKUP_IGNORE_RULE) === false) {
    add(BACKUP_IGNORE_RULE);
  }
  if (additions.length === 0) return undefined;
  const base = content.replace(/\s+$/, "");
  const header = `# Priozar state directory (mirrors the ${SOURCE_NAME} rules)`;
  return `${base}${base ? "\n" : ""}${header}\n${additions.join("\n")}\n`;
}

async function planArtifacts(
  sourcePath: string,
  gitignoreChanges: boolean,
): Promise<BrandMigrationPlan["artifacts"]> {
  const entries = (await readdir(sourcePath)).sort();
  return [
    ...entries.map((name) => ({
      path: `${SOURCE_NAME}/${name}`,
      action: "copied" as const,
    })),
    ...(gitignoreChanges
      ? [{ path: ".gitignore", action: "migrated" as const }]
      : []),
    // The source is only deleted after the copy has been verified and validated.
    { path: SOURCE_NAME, action: "removed" as const },
  ];
}

async function assertSourceIsCurrent(projectRoot: string): Promise<void> {
  const inspection = await inspectInstallation(projectRoot);
  if (inspection.status !== "current") {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Cannot migrate: the ${SOURCE_NAME} installation is ${inspection.status}, not current. Run "autoforge doctor" and repair it first.`,
      {
        details: { projectRoot, status: inspection.status },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }
}

async function atomicWrite(
  destination: string,
  content: string,
  temporaryPath: string,
): Promise<void> {
  await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
  try {
    await rename(temporaryPath, destination);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function migrateBrand(
  options: BrandMigrationOptions,
): Promise<BrandMigrationPlan> {
  const projectRoot = path.resolve(options.projectRoot);
  const sourcePath = path.join(projectRoot, SOURCE_NAME);
  const targetPath = path.join(projectRoot, TARGET_NAME);
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const lockPath = path.join(projectRoot, `${TARGET_NAME}.migrate.lock`);
  const temporaryId = options.temporaryId ?? randomUUID;

  if (!(await pathExists(sourcePath))) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Cannot migrate: source directory ${SOURCE_NAME} does not exist in ${projectRoot}`,
      {
        details: { projectRoot, sourcePath },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }

  // Conflict detection: if both .autoforge and .priozar exist
  if (await pathExists(targetPath)) {
    throw new AutoForgeError(
      "STATE_CONFLICT",
      `Dual-directory conflict: both ${SOURCE_NAME} and ${TARGET_NAME} exist. Resolve manually before migrating.`,
      {
        details: { sourcePath, targetPath },
        exitCode: EXIT_CODE.conflict,
      },
    );
  }

  await assertSourceIsCurrent(projectRoot);

  const originalGitignore = await readOptionalText(gitignorePath);
  const mirroredGitignore =
    originalGitignore === undefined
      ? undefined
      : mirrorGitignoreRules(originalGitignore);

  if (options.dryRun) {
    return {
      status: "planned",
      sourceDirectory: SOURCE_NAME,
      targetDirectory: TARGET_NAME,
      projectRoot,
      backupDirectory: null,
      artifacts: await planArtifacts(
        sourcePath,
        mirroredGitignore !== undefined,
      ),
      validation: "not-run",
    };
  }

  // Acquire mutation lock
  let lockHandle: FileHandle | undefined;
  try {
    lockHandle = await open(lockPath, "wx");
    await lockHandle.writeFile(`${process.pid}\n`, "utf8");
    await lockHandle.sync();
  } catch (error) {
    if (lockHandle) {
      await lockHandle.close();
      await rm(lockPath, { force: true });
    }
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        "Another brand migration or project mutation is currently in progress.",
        { details: { lockPath }, exitCode: EXIT_CODE.conflict },
      );
    }
    throw error;
  }

  const operationId = temporaryId();
  const backupDirName = `${SOURCE_NAME}.backup-${operationId}`;
  const backupPath = path.join(projectRoot, backupDirName);
  const stagingPath = path.join(
    projectRoot,
    `${TARGET_NAME}.staging-${operationId}`,
  );
  const gitignoreTemporaryPath = path.join(
    projectRoot,
    `.gitignore.migrate-${operationId}.tmp`,
  );
  const artifacts = await planArtifacts(
    sourcePath,
    mirroredGitignore !== undefined,
  );
  let published = false;
  let gitignoreWritten = false;

  try {
    // 1. Create a complete, recoverable backup
    await cp(sourcePath, backupPath, { recursive: true });

    // 2. Stage a full copy; the source stays untouched throughout
    await cp(sourcePath, stagingPath, { recursive: true });

    // 3. Publish the copy under the new name
    await rename(stagingPath, targetPath);
    published = true;

    // 4. The copy must match the source file for file, including untracked
    //    runtime state such as sessions and context packets
    const [sourceTree, targetTree] = await Promise.all([
      listTree(sourcePath),
      listTree(targetPath),
    ]);
    const mismatched = [...sourceTree].filter(
      ([file, size]) => targetTree.get(file) !== size,
    );
    if (mismatched.length > 0 || sourceTree.size !== targetTree.size) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Copied ${TARGET_NAME} does not match ${SOURCE_NAME}; the source was left in place.`,
        {
          details: {
            mismatched: mismatched.slice(0, 10).map(([file]) => file),
          },
          exitCode: EXIT_CODE.conflict,
        },
      );
    }

    // 5. Keep runtime state ignored under the new directory name
    if (mirroredGitignore !== undefined) {
      await atomicWrite(
        gitignorePath,
        mirroredGitignore,
        gitignoreTemporaryPath,
      );
      gitignoreWritten = true;
    }

    // 6. Validate with the real installation check, which now resolves the
    //    new directory because it takes precedence over the legacy one
    const inspection = await inspectInstallation(projectRoot);
    if (inspection.status !== "current") {
      throw new AutoForgeError(
        "INVALID_STATE",
        `Migrated ${TARGET_NAME} failed validation (${inspection.status}); the source was left in place.`,
        {
          details: { status: inspection.status },
          exitCode: EXIT_CODE.invalidState,
        },
      );
    }
  } catch (error) {
    // The source was never modified, so rolling back only removes what this
    // run created.
    if (published) {
      await rm(targetPath, { recursive: true, force: true });
    }
    if (gitignoreWritten && originalGitignore !== undefined) {
      await writeFile(gitignorePath, originalGitignore, "utf8");
    }
    await rm(stagingPath, { recursive: true, force: true });
    await rm(gitignoreTemporaryPath, { force: true });
    throw error;
  } finally {
    if (lockHandle) {
      await lockHandle.close();
      await rm(lockPath, { force: true });
    }
  }

  // 7. Only now, with the copy verified and validated, remove the source. The
  //    backup remains available for recovery.
  try {
    await rm(sourcePath, { recursive: true, force: true });
  } catch (error) {
    throw new AutoForgeError(
      "FILESYSTEM_ERROR",
      `Migrated to ${TARGET_NAME} but could not remove ${SOURCE_NAME}. Remove it manually; a backup is at ${backupDirName}.`,
      { cause: error, exitCode: EXIT_CODE.filesystem },
    );
  }

  return {
    status: "migrated",
    sourceDirectory: SOURCE_NAME,
    targetDirectory: TARGET_NAME,
    projectRoot,
    backupDirectory: backupDirName,
    artifacts,
    validation: "valid",
  };
}
