import { copyFile, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { StateEnvelope } from "./schemas.js";

export interface StateStoreOptions<Data> {
  filePath: string;
  schema: z.ZodType<StateEnvelope<Data>>;
  schemaVersion: number;
  now?: () => Date;
  temporaryId?: () => string;
}

export interface StateReadResult<Data> {
  state: StateEnvelope<Data>;
  source: "primary" | "backup";
}

export interface StateWriteOptions {
  expectedRevision: number;
}

function stateError(
  message: string,
  filePath: string,
  cause?: unknown,
): AutoForgeError {
  return new AutoForgeError("INVALID_STATE", message, {
    cause,
    details: { path: filePath },
    exitCode: EXIT_CODE.invalidState,
  });
}

function conflictError(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("STATE_CONFLICT", message, {
    details,
    exitCode: EXIT_CODE.conflict,
  });
}

async function readValidatedState<Data>(
  filePath: string,
  schema: z.ZodType<StateEnvelope<Data>>,
): Promise<StateEnvelope<Data>> {
  let value: unknown;

  try {
    value = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw stateError(
      `Unable to read valid JSON state from ${filePath}`,
      filePath,
      error,
    );
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AutoForgeError("INVALID_STATE", `Invalid state in ${filePath}`, {
      details: { path: filePath, issues: result.error.issues },
      exitCode: EXIT_CODE.invalidState,
    });
  }

  return result.data;
}

export class AtomicStateStore<Data> {
  readonly filePath: string;
  readonly backupPath: string;
  readonly lockPath: string;

  private readonly schema: z.ZodType<StateEnvelope<Data>>;
  private readonly schemaVersion: number;
  private readonly now: () => Date;
  private readonly temporaryId: () => string;

  constructor(options: StateStoreOptions<Data>) {
    this.filePath = path.resolve(options.filePath);
    this.backupPath = `${this.filePath}.bak`;
    this.lockPath = `${this.filePath}.lock`;
    this.schema = options.schema;
    this.schemaVersion = options.schemaVersion;
    this.now = options.now ?? (() => new Date());
    this.temporaryId =
      options.temporaryId ??
      (() =>
        `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  async read(): Promise<StateReadResult<Data>> {
    try {
      return {
        state: await readValidatedState(this.filePath, this.schema),
        source: "primary",
      };
    } catch (primaryError) {
      try {
        return {
          state: await readValidatedState(this.backupPath, this.schema),
          source: "backup",
        };
      } catch (backupError) {
        throw new AutoForgeError(
          "INVALID_STATE",
          `Neither primary nor backup state is valid for ${this.filePath}`,
          {
            cause: primaryError,
            details: {
              path: this.filePath,
              backupPath: this.backupPath,
              backupError:
                backupError instanceof Error
                  ? backupError.message
                  : String(backupError),
            },
            exitCode: EXIT_CODE.invalidState,
          },
        );
      }
    }
  }

  async initialize(data: Data): Promise<StateEnvelope<Data>> {
    return this.withLock(async () => {
      if (await this.primaryExists()) {
        throw conflictError(`State already exists at ${this.filePath}`, {
          path: this.filePath,
        });
      }

      const state = this.validate({
        schemaVersion: this.schemaVersion,
        revision: 0,
        updatedAt: this.now().toISOString(),
        data,
      });
      await this.atomicWrite(this.filePath, state);
      return state;
    });
  }

  async write(
    data: Data,
    options: StateWriteOptions,
  ): Promise<StateEnvelope<Data>> {
    return this.withLock(async () => {
      const currentState = await readValidatedState(this.filePath, this.schema);
      if (currentState.revision !== options.expectedRevision) {
        throw conflictError(`State revision changed for ${this.filePath}`, {
          path: this.filePath,
          expectedRevision: options.expectedRevision,
          actualRevision: currentState.revision,
        });
      }

      const nextState = this.validate({
        schemaVersion: this.schemaVersion,
        revision: currentState.revision + 1,
        updatedAt: this.now().toISOString(),
        data,
      });

      await this.atomicCopy(this.filePath, this.backupPath);
      await this.atomicWrite(this.filePath, nextState);
      return nextState;
    });
  }

  async recoverFromBackup(): Promise<StateEnvelope<Data>> {
    return this.withLock(async () => {
      const backupState = await readValidatedState(
        this.backupPath,
        this.schema,
      );
      await this.atomicWrite(this.filePath, backupState);
      return backupState;
    });
  }

  private validate(value: unknown): StateEnvelope<Data> {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    throw new AutoForgeError(
      "INVALID_STATE",
      "Refusing to write invalid state",
      {
        details: { path: this.filePath, issues: result.error.issues },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }

  private async primaryExists(): Promise<boolean> {
    try {
      await readFile(this.filePath);
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return false;
      }
      throw error;
    }
  }

  private async withLock<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    let lockHandle: FileHandle | undefined;
    try {
      lockHandle = await open(this.lockPath, "wx");
      await lockHandle.writeFile(`${process.pid}\n`, "utf8");
      await lockHandle.sync();
    } catch (error) {
      if (lockHandle) {
        await lockHandle.close();
        await rm(this.lockPath, { force: true });
      }
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw conflictError(`State is locked at ${this.filePath}`, {
          path: this.filePath,
          lockPath: this.lockPath,
        });
      }
      throw new AutoForgeError(
        "FILESYSTEM_ERROR",
        `Unable to acquire state lock for ${this.filePath}`,
        {
          cause: error,
          details: { path: this.filePath, lockPath: this.lockPath },
          exitCode: EXIT_CODE.filesystem,
        },
      );
    }

    try {
      return await operation();
    } finally {
      try {
        await lockHandle.close();
      } finally {
        await rm(this.lockPath, { force: true });
      }
    }
  }

  private async atomicCopy(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const temporaryPath = this.getTemporaryPath(destinationPath);
    try {
      await copyFile(sourcePath, temporaryPath);
      const temporaryHandle = await open(temporaryPath, "r");
      try {
        await temporaryHandle.sync();
      } finally {
        await temporaryHandle.close();
      }
      await rename(temporaryPath, destinationPath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  private async atomicWrite(
    destinationPath: string,
    state: StateEnvelope<Data>,
  ): Promise<void> {
    const temporaryPath = this.getTemporaryPath(destinationPath);
    const serializedState = `${JSON.stringify(state, null, 2)}\n`;

    try {
      const temporaryHandle = await open(temporaryPath, "wx");
      try {
        await temporaryHandle.writeFile(serializedState, "utf8");
        await temporaryHandle.sync();
      } finally {
        await temporaryHandle.close();
      }
      await rename(temporaryPath, destinationPath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  private getTemporaryPath(destinationPath: string): string {
    return `${destinationPath}.${this.temporaryId()}.tmp`;
  }
}
