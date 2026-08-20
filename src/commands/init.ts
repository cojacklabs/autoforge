import { randomUUID } from "node:crypto";
import {
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

import {
  createDefaultConfig,
  parseConfig,
  type AutoForgeConfig,
} from "../core/config.js";
import {
  createDecisionStore,
  createInitialDecisionMemory,
  parseDecisionMemoryEnvelope,
} from "../decisions/store.js";
import type { DecisionMemory } from "../decisions/schemas.js";
import { createInitialDoctrineRegistry } from "../doctrine/builtins.js";
import {
  createDoctrineSessionStore,
  createInitialDoctrineSessionState,
  parseDoctrineSessionStateEnvelope,
  type DoctrineSessionState,
} from "../doctrine/session.js";
import type { DoctrineRegistry } from "../doctrine/schemas.js";
import {
  createDoctrineStore,
  parseDoctrineRegistryEnvelope,
} from "../doctrine/store.js";
import { AutoForgeError, EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  createInitialSessionState,
  createInitialWorkState,
  createSessionStateStore,
  createWorkStateStore,
  parseSessionStateEnvelope,
  parseWorkStateEnvelope,
} from "../state/kernel.js";
import {
  createProjectMetadataEnvelope,
  parseProjectMetadataEnvelope,
  projectMetadataEnvelopeSchema,
  STATE_SCHEMA_VERSION,
  type ProjectMetadataEnvelope,
} from "../state/schemas.js";
import type { StateEnvelope } from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import type { SessionState, WorkState } from "../work/schemas.js";

export type InstallationStatus = "absent" | "current" | "legacy" | "partial";

export interface InstallationInspection {
  status: InstallationStatus;
  directory: string;
  config?: AutoForgeConfig;
  metadata?: ProjectMetadataEnvelope;
  work?: StateEnvelope<WorkState>;
  session?: StateEnvelope<SessionState>;
  decisions?: StateEnvelope<DecisionMemory>;
  doctrines?: StateEnvelope<DoctrineRegistry>;
  doctrineSession?: StateEnvelope<DoctrineSessionState>;
}

export interface InitializeProjectOptions {
  projectRoot: string;
  projectId?: string;
  now?: () => Date;
  temporaryId?: () => string;
}

export interface InitCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
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

async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new AutoForgeError("INVALID_STATE", `Invalid JSON in ${filePath}`, {
      cause: error,
      details: { path: filePath },
      exitCode: EXIT_CODE.invalidState,
    });
  }
}

export async function inspectInstallation(
  projectRoot: string,
): Promise<InstallationInspection> {
  const directory = path.join(path.resolve(projectRoot), ".autoforge");
  if (!(await pathExists(directory))) {
    return { status: "absent", directory };
  }

  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory()) {
    return { status: "partial", directory };
  }

  const configPath = path.join(directory, "config.json");
  const metadataPath = path.join(directory, "state", "metadata.json");
  const workPath = path.join(directory, "state", "work.json");
  const sessionPath = path.join(directory, "state", "session.json");
  const decisionsPath = path.join(directory, "state", "decisions.json");
  const doctrinesPath = path.join(directory, "state", "doctrines.json");
  const doctrineSessionPath = path.join(
    directory,
    "state",
    "doctrine-session.json",
  );
  const hasConfig = await pathExists(configPath);
  const hasMetadata = await pathExists(metadataPath);
  const hasWork = await pathExists(workPath);
  const hasSession = await pathExists(sessionPath);
  const hasDecisions = await pathExists(decisionsPath);
  const hasDoctrines = await pathExists(doctrinesPath);
  const hasDoctrineSession = await pathExists(doctrineSessionPath);

  if (
    !hasConfig &&
    !hasMetadata &&
    !hasWork &&
    !hasSession &&
    !hasDecisions &&
    !hasDoctrines &&
    !hasDoctrineSession
  ) {
    return { status: "legacy", directory };
  }

  if (
    !hasConfig ||
    !hasMetadata ||
    !hasWork ||
    !hasSession ||
    !hasDecisions ||
    !hasDoctrines ||
    !hasDoctrineSession
  ) {
    return { status: "partial", directory };
  }

  const config = parseConfig(await readJson(configPath));
  const metadata = parseProjectMetadataEnvelope(await readJson(metadataPath));
  const work = parseWorkStateEnvelope(await readJson(workPath));
  const session = parseSessionStateEnvelope(await readJson(sessionPath));
  const decisions = parseDecisionMemoryEnvelope(await readJson(decisionsPath));
  const doctrines = parseDoctrineRegistryEnvelope(
    await readJson(doctrinesPath),
  );
  const doctrineSession = parseDoctrineSessionStateEnvelope(
    await readJson(doctrineSessionPath),
  );
  const workActive = work.data.activeWork;
  const sessionActive = session.data.current?.activeWork ?? null;
  const activeStateMatches =
    (workActive === null && session.data.current === null) ||
    (workActive !== null &&
      session.data.current !== null &&
      sessionActive !== null &&
      sessionActive.kind === workActive.kind &&
      sessionActive.id === workActive.id &&
      sessionActive.startedAt === workActive.startedAt);
  const doctrineSessionMatches =
    (session.data.current === null && doctrineSession.data.current === null) ||
    (session.data.current !== null &&
      doctrineSession.data.current !== null &&
      doctrineSession.data.current.sessionId === session.data.current.id &&
      doctrineSession.data.current.workKind ===
        session.data.current.activeWork?.kind &&
      doctrineSession.data.current.workId ===
        session.data.current.activeWork?.id);
  if (
    config.projectId !== metadata.data.projectId ||
    !activeStateMatches ||
    !doctrineSessionMatches
  ) {
    return {
      status: "partial",
      directory,
      config,
      metadata,
      work,
      session,
      decisions,
      doctrines,
      doctrineSession,
    };
  }

  return {
    status: "current",
    directory,
    config,
    metadata,
    work,
    session,
    decisions,
    doctrines,
    doctrineSession,
  };
}

function installationConflict(
  inspection: InstallationInspection,
): AutoForgeError {
  if (inspection.status === "legacy") {
    return new AutoForgeError(
      "STATE_CONFLICT",
      'A legacy AutoForge installation was detected. Run "autoforge migrate --dry-run" to inspect the migration; no files were changed.',
      {
        details: { path: inspection.directory, status: inspection.status },
        exitCode: EXIT_CODE.conflict,
      },
    );
  }

  if (inspection.status === "partial") {
    return new AutoForgeError(
      "INVALID_STATE",
      "A partial AutoForge installation was detected. Repair or migrate it before initialization; no files were changed.",
      {
        details: { path: inspection.directory, status: inspection.status },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }

  return new AutoForgeError(
    "STATE_CONFLICT",
    "AutoForge is already initialized; no files were changed.",
    {
      details: { path: inspection.directory, status: inspection.status },
      exitCode: EXIT_CODE.conflict,
    },
  );
}

export async function initializeProject(
  options: InitializeProjectOptions,
): Promise<InstallationInspection> {
  const projectRoot = path.resolve(options.projectRoot);
  const targetDirectory = path.join(projectRoot, ".autoforge");
  const lockPath = path.join(projectRoot, ".autoforge.init.lock");
  const temporaryId = options.temporaryId ?? randomUUID;
  const stagingDirectory = path.join(
    projectRoot,
    `.autoforge.init-${temporaryId()}`,
  );
  const now = options.now ?? (() => new Date());

  const initialInspection = await inspectInstallation(projectRoot);
  if (initialInspection.status !== "absent") {
    throw installationConflict(initialInspection);
  }

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
        "Another AutoForge initialization is in progress.",
        {
          details: { lockPath },
          exitCode: EXIT_CODE.conflict,
        },
      );
    }
    throw error;
  }

  try {
    const lockedInspection = await inspectInstallation(projectRoot);
    if (lockedInspection.status !== "absent") {
      throw installationConflict(lockedInspection);
    }

    const timestamp = now().toISOString();
    const projectId = options.projectId ?? randomUUID();
    const config = createDefaultConfig(projectId);
    const metadata = createProjectMetadataEnvelope(projectId, timestamp);

    await mkdir(path.join(stagingDirectory, "state"), { recursive: true });
    await writeFile(
      path.join(stagingDirectory, "config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );

    const metadataStore = new AtomicStateStore({
      filePath: path.join(stagingDirectory, "state", "metadata.json"),
      schema: projectMetadataEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
      now: () => new Date(timestamp),
      temporaryId,
    });
    await metadataStore.initialize(metadata.data);
    const stagedStoreOptions = {
      now: () => new Date(timestamp),
      stateDirectory: "state",
      temporaryId,
    };
    await createWorkStateStore(stagingDirectory, stagedStoreOptions).initialize(
      createInitialWorkState(),
    );
    await createSessionStateStore(
      stagingDirectory,
      stagedStoreOptions,
    ).initialize(createInitialSessionState());
    await createDecisionStore(stagingDirectory, stagedStoreOptions).initialize(
      createInitialDecisionMemory(),
    );
    await createDoctrineStore(stagingDirectory, stagedStoreOptions).initialize(
      createInitialDoctrineRegistry(timestamp),
    );
    await createDoctrineSessionStore(
      stagingDirectory,
      stagedStoreOptions,
    ).initialize(createInitialDoctrineSessionState());

    const publishInspection = await inspectInstallation(projectRoot);
    if (publishInspection.status !== "absent") {
      throw installationConflict(publishInspection);
    }

    try {
      await mkdir(targetDirectory);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw installationConflict(await inspectInstallation(projectRoot));
      }
      throw error;
    }

    await rename(
      path.join(stagingDirectory, "config.json"),
      path.join(targetDirectory, "config.json"),
    );
    await rename(
      path.join(stagingDirectory, "state"),
      path.join(targetDirectory, "state"),
    );
    return {
      status: "current",
      directory: targetDirectory,
      config,
      metadata,
    };
  } finally {
    try {
      await rm(stagingDirectory, { recursive: true, force: true });
    } finally {
      try {
        await lockHandle.close();
      } finally {
        await rm(lockPath, { force: true });
      }
    }
  }
}

export async function runInitCommand(
  options: InitCommandOptions,
): Promise<ExitCode> {
  if (options.args.length > 0) {
    options.output.stderr('Command "init" does not accept arguments.');
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const installation = await initializeProject({ projectRoot: project.path });
  options.output.stdout(`Initialized AutoForge in ${installation.directory}`);
  return EXIT_CODE.success;
}
