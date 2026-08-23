import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  experimentMemorySchema,
  type ExperimentMemory,
} from "./experiment-schemas.js";

export const experimentMemoryEnvelopeSchema = createStateEnvelopeSchema(
  experimentMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialExperimentMemory(): ExperimentMemory {
  return experimentMemorySchema.parse({ experiments: [] });
}

export class ExperimentStore {
  readonly state: AtomicStateStore<ExperimentMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "experiments.json"),
      ),
      schema: experimentMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialExperimentMemory());
    }
  }
}
