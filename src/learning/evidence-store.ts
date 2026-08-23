import { access } from "node:fs/promises";
import path from "node:path";

import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  evidenceMemorySchema,
  type EvidenceMemory,
} from "./evidence-schemas.js";

export const evidenceMemoryEnvelopeSchema = createStateEnvelopeSchema(
  evidenceMemorySchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialEvidenceMemory(): EvidenceMemory {
  return evidenceMemorySchema.parse({ evidence: [] });
}

export class EvidenceStore {
  readonly state: AtomicStateStore<EvidenceMemory>;

  constructor(projectRoot: string) {
    this.state = new AtomicStateStore({
      filePath: resolveProjectPath(
        projectRoot,
        path.join(".autoforge", "learning", "evidence.json"),
      ),
      schema: evidenceMemoryEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialEvidenceMemory());
    }
  }
}
