import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  hypothesisMemorySchema,
  type HypothesisMemory,
} from "./hypothesis-schemas.js";

export const hypothesisMemoryEnvelopeSchema = createStateEnvelopeSchema(
  hypothesisMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialHypothesisMemory(): HypothesisMemory {
  return hypothesisMemorySchema.parse({ hypotheses: [] });
}

export class HypothesisStore {
  readonly state: AtomicStateStore<HypothesisMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "hypotheses.json"),
      ),
      schema: hypothesisMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialHypothesisMemory());
    }
  }
}
