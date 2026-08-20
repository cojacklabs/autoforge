import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
  type StateEnvelope,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import { decisionMemorySchema, type DecisionMemory } from "./schemas.js";

export const decisionMemoryEnvelopeSchema = createStateEnvelopeSchema(
  decisionMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export interface DecisionStoreOptions {
  now?: () => Date;
  temporaryId?: () => string;
  stateDirectory?: string;
}

export function createInitialDecisionMemory(): DecisionMemory {
  return decisionMemorySchema.parse({ decisions: [] });
}

export function parseDecisionMemoryEnvelope(
  value: unknown,
): StateEnvelope<DecisionMemory> {
  const result = decisionMemoryEnvelopeSchema.safeParse(value);
  if (!result.success) {
    throw new AutoForgeError("INVALID_STATE", "Invalid decision state", {
      details: { issues: result.error.issues },
      exitCode: EXIT_CODE.invalidState,
    });
  }
  return result.data;
}

export function createDecisionStore(
  projectRoot: string,
  options: DecisionStoreOptions = {},
): AtomicStateStore<DecisionMemory> {
  const { stateDirectory = ".autoforge/state", ...storeOptions } = options;
  return new AtomicStateStore({
    filePath: resolveProjectPath(
      projectRoot,
      `${stateDirectory}/decisions.json`,
    ),
    schema: decisionMemoryEnvelopeSchema,
    schemaVersion: STATE_SCHEMA_VERSION,
    ...storeOptions,
  });
}
