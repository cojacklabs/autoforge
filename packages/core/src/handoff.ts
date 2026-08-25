import {
  createAgentHandoff,
  type AgentHandoff,
  type CreateAgentHandoffInput,
} from "@cojacklabs/autoforge-protocol";

import type { Clock } from "./ports.js";

export interface AgentHandoffRepository {
  write(handoff: AgentHandoff): Promise<string>;
  read(id: string): Promise<AgentHandoff | null>;
  list(): Promise<AgentHandoff[]>;
}

export interface AgentHandoffServiceOptions {
  clock?: Clock;
}

export interface AgentHandoffResult {
  handoff: AgentHandoff;
  location: string;
}

export class AgentHandoffService {
  private readonly repository: AgentHandoffRepository;
  private readonly clock: Clock;

  constructor(
    repository: AgentHandoffRepository,
    options: AgentHandoffServiceOptions = {},
  ) {
    this.repository = repository;
    this.clock = options.clock ?? { now: () => new Date() };
  }

  async create(input: CreateAgentHandoffInput): Promise<AgentHandoffResult> {
    const handoff = createAgentHandoff(input, this.clock.now());
    const location = await this.repository.write(handoff);
    return { handoff, location };
  }

  read(id: string): Promise<AgentHandoff | null> {
    return this.repository.read(id);
  }

  list(): Promise<AgentHandoff[]> {
    return this.repository.list();
  }
}
