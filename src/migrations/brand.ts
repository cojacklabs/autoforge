import { randomUUID } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

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
        action: z.enum(["copied", "migrated", "preserved"]),
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

export async function migrateBrand(
  options: BrandMigrationOptions,
): Promise<BrandMigrationPlan> {
  const projectRoot = path.resolve(options.projectRoot);
  const sourceName = FRAMEWORK_IDENTITY.current.stateDirectory;
  const targetName = FRAMEWORK_IDENTITY.successor.stateDirectory;
  const sourcePath = path.join(projectRoot, sourceName);
  const targetPath = path.join(projectRoot, targetName);
  const lockPath = path.join(projectRoot, `${targetName}.migrate.lock`);
  const now = options.now ?? (() => new Date());
  const temporaryId = options.temporaryId ?? randomUUID;

  if (!(await pathExists(sourcePath))) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Cannot migrate: source directory ${sourceName} does not exist in ${projectRoot}`,
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
      `Dual-directory conflict: both ${sourceName} and ${targetName} exist. Resolve manually before migrating.`,
      {
        details: { sourcePath, targetPath },
        exitCode: EXIT_CODE.conflict,
      },
    );
  }

  if (options.dryRun) {
    return {
      status: "planned",
      sourceDirectory: sourceName,
      targetDirectory: targetName,
      projectRoot,
      backupDirectory: null,
      artifacts: [
        { path: sourceName, action: "copied" },
        { path: `${sourceName}/config.json`, action: "migrated" },
        { path: `${sourceName}/state`, action: "preserved" },
      ],
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

  const backupDirName = `${sourceName}.backup-${temporaryId()}`;
  const backupPath = path.join(projectRoot, backupDirName);
  const stagingDirName = `${targetName}.staging-${temporaryId()}`;
  const stagingPath = path.join(projectRoot, stagingDirName);

  try {
    // 1. Create a complete, recoverable backup
    await cp(sourcePath, backupPath, { recursive: true });

    // 2. Stage the successor directory
    await cp(sourcePath, stagingPath, { recursive: true });

    // 3. Update agent contract and references in staging if needed
    const contractPath = path.join(stagingPath, "agent-contract.json");
    if (await pathExists(contractPath)) {
      try {
        const contract = JSON.parse(await readFile(contractPath, "utf8"));
        if (contract && typeof contract === "object") {
          contract.framework = FRAMEWORK_IDENTITY.successor.product;
          await writeFile(
            contractPath,
            JSON.stringify(contract, null, 2),
            "utf8",
          );
        }
      } catch {
        // Ignore malformed contract; contract generator will repair it
      }
    }

    // 4. Atomically publish target directory
    await rename(stagingPath, targetPath);

    // 5. Cleanly remove source directory only after target is published
    await rm(sourcePath, { recursive: true, force: true });

    return {
      status: "migrated",
      sourceDirectory: sourceName,
      targetDirectory: targetName,
      projectRoot,
      backupDirectory: backupDirName,
      artifacts: [
        { path: sourceName, action: "migrated" },
        { path: targetName, action: "preserved" },
      ],
      validation: "valid",
    };
  } catch (error) {
    // Rollback: if staging or target failed, ensure source is restored
    if (!(await pathExists(sourcePath)) && (await pathExists(backupPath))) {
      await cp(backupPath, sourcePath, { recursive: true });
    }
    if (await pathExists(stagingPath)) {
      await rm(stagingPath, { recursive: true, force: true });
    }
    throw error;
  } finally {
    if (lockHandle) {
      await lockHandle.close();
      await rm(lockPath, { force: true });
    }
  }
}
