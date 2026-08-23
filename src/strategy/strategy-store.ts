import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  strategyMemorySchema,
  type StrategyMemory,
} from "./strategy-schemas.js";

export const strategyMemoryEnvelopeSchema = createStateEnvelopeSchema(
  strategyMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialStrategyMemory(): StrategyMemory {
  return strategyMemorySchema.parse({ assessments: [] });
}

export class StrategyStore {
  readonly state: AtomicStateStore<StrategyMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "strategy.json"),
      ),
      schema: strategyMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialStrategyMemory());
    }
  }
}
