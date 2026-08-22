import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import {
  orchestrationAssignmentPacketSchema,
  orchestrationHandoffInputSchema,
  orchestrationStateSchema,
  type OrchestrationAssignmentPacket,
  type OrchestrationHandoffInput,
  type OrchestrationState,
} from "./schemas.js";

export const orchestrationStateEnvelopeSchema = createStateEnvelopeSchema(
  orchestrationStateSchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export function createInitialOrchestrationState(): OrchestrationState {
  return orchestrationStateSchema.parse({
    nodes: [],
    assignments: [],
    leases: [],
    gates: [],
    events: [],
  });
}

export class OrchestrationStore {
  readonly state: AtomicStateStore<OrchestrationState>;
  private readonly directory: string;

  constructor(projectRoot: string) {
    this.directory = path.join(projectRoot, ".autoforge", "orchestration");
    this.state = new AtomicStateStore({
      filePath: path.join(this.directory, "state.json"),
      schema: orchestrationStateEnvelopeSchema,
      schemaVersion: STATE_SCHEMA_VERSION,
    });
  }

  async ensure(): Promise<void> {
    try {
      await access(this.state.filePath);
    } catch {
      await this.state.initialize(createInitialOrchestrationState());
    }
  }

  async writePacket(packet: OrchestrationAssignmentPacket): Promise<string> {
    const validated = orchestrationAssignmentPacketSchema.parse(packet);
    const directory = path.join(this.directory, "packets");
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, `${validated.assignmentId}.json`);
    await writeFile(destination, `${JSON.stringify(validated, null, 2)}\n`);
    return destination;
  }

  async readPacket(
    assignmentId: string,
  ): Promise<OrchestrationAssignmentPacket> {
    const source = path.join(this.directory, "packets", `${assignmentId}.json`);
    return orchestrationAssignmentPacketSchema.parse(
      JSON.parse(await readFile(source, "utf8")) as unknown,
    );
  }

  async writeHandoff(
    assignmentId: string,
    handoff: OrchestrationHandoffInput,
  ): Promise<string> {
    const validated = orchestrationHandoffInputSchema.parse(handoff);
    const directory = path.join(this.directory, "handoffs");
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, `${assignmentId}.json`);
    await writeFile(destination, `${JSON.stringify(validated, null, 2)}\n`);
    return destination;
  }
}
