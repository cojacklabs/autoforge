import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
  type StateEnvelope,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import { doctrineRegistrySchema, type DoctrineRegistry } from "./schemas.js";

export const doctrineRegistryEnvelopeSchema = createStateEnvelopeSchema(
  doctrineRegistrySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export interface DoctrineStoreOptions {
  now?: () => Date;
  temporaryId?: () => string;
  stateDirectory?: string;
}

export function parseDoctrineRegistryEnvelope(
  value: unknown,
): StateEnvelope<DoctrineRegistry> {
  const result = doctrineRegistryEnvelopeSchema.safeParse(value);
  if (!result.success) {
    throw new AutoForgeError("INVALID_STATE", "Invalid doctrine state", {
      details: { issues: result.error.issues },
      exitCode: EXIT_CODE.invalidState,
    });
  }
  return result.data;
}

export function createDoctrineStore(
  projectRoot: string,
  options: DoctrineStoreOptions = {},
): AtomicStateStore<DoctrineRegistry> {
  const { stateDirectory = ".autoforge/state", ...storeOptions } = options;
  return new AtomicStateStore({
    filePath: resolveProjectPath(
      projectRoot,
      `${stateDirectory}/doctrines.json`,
    ),
    schema: doctrineRegistryEnvelopeSchema,
    schemaVersion: STATE_SCHEMA_VERSION,
    ...storeOptions,
  });
}
