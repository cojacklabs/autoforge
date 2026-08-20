import { resolveProjectPath } from "../core/paths.js";
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import {
  sessionStateSchema,
  workStateSchema,
  type SessionState,
  type WorkState,
} from "../work/schemas.js";
import { createStateEnvelopeSchema, STATE_SCHEMA_VERSION } from "./schemas.js";
import type { StateEnvelope } from "./schemas.js";
import { AtomicStateStore } from "./store.js";

export const workStateEnvelopeSchema = createStateEnvelopeSchema(
  workStateSchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export const sessionStateEnvelopeSchema = createStateEnvelopeSchema(
  sessionStateSchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

function invalidKernelState(
  name: "work" | "session",
  issues: unknown,
): AutoForgeError {
  return new AutoForgeError("INVALID_STATE", `Invalid ${name} state`, {
    details: { issues },
    exitCode: EXIT_CODE.invalidState,
  });
}

export function parseWorkStateEnvelope(
  value: unknown,
): StateEnvelope<WorkState> {
  const result = workStateEnvelopeSchema.safeParse(value);
  if (!result.success) {
    throw invalidKernelState("work", result.error.issues);
  }
  return result.data;
}

export function parseSessionStateEnvelope(
  value: unknown,
): StateEnvelope<SessionState> {
  const result = sessionStateEnvelopeSchema.safeParse(value);
  if (!result.success) {
    throw invalidKernelState("session", result.error.issues);
  }
  return result.data;
}

export interface KernelStoreOptions {
  now?: () => Date;
  temporaryId?: () => string;
  stateDirectory?: string;
}

function kernelStatePath(
  projectRoot: string,
  fileName: string,
  stateDirectory = ".autoforge/state",
): string {
  return resolveProjectPath(projectRoot, `${stateDirectory}/${fileName}`);
}

export function createInitialWorkState(): WorkState {
  return workStateSchema.parse({
    features: [],
    phases: [],
    tasks: [],
    issues: [],
    activeWork: null,
  });
}

export function createInitialSessionState(): SessionState {
  return sessionStateSchema.parse({
    current: null,
    previous: [],
  });
}

export function createWorkStateStore(
  projectRoot: string,
  options: KernelStoreOptions = {},
): AtomicStateStore<WorkState> {
  const { stateDirectory, ...storeOptions } = options;
  return new AtomicStateStore({
    filePath: kernelStatePath(projectRoot, "work.json", stateDirectory),
    schema: workStateEnvelopeSchema,
    schemaVersion: STATE_SCHEMA_VERSION,
    ...storeOptions,
  });
}

export function createSessionStateStore(
  projectRoot: string,
  options: KernelStoreOptions = {},
): AtomicStateStore<SessionState> {
  const { stateDirectory, ...storeOptions } = options;
  return new AtomicStateStore({
    filePath: kernelStatePath(projectRoot, "session.json", stateDirectory),
    schema: sessionStateEnvelopeSchema,
    schemaVersion: STATE_SCHEMA_VERSION,
    ...storeOptions,
  });
}
