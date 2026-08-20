import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import {
  agentDetectionSchema,
  validateAgentAdapterDefinition,
  type AgentAdapter,
  type AgentAdapterContext,
  type AgentCapabilities,
  type AgentDetection,
} from "./adapter.js";
import { ClaudeAgentAdapter } from "./claude.js";
import { CodexAgentAdapter } from "./codex.js";
import { CursorAgentAdapter } from "./cursor.js";
import { GeminiAgentAdapter } from "./gemini.js";
import { GenericAgentAdapter } from "./generic.js";
import { GrokAgentAdapter } from "./grok.js";

export interface AgentCapabilityRequirements {
  setup?: AgentCapabilities["setup"];
  contextDelivery?: AgentCapabilities["contextDelivery"][number];
  minimumEnforcement?: AgentCapabilities["enforcement"];
}

export interface DetectedAgent {
  adapter: AgentAdapter;
  detection: AgentDetection;
}

export interface ResolveAgentOptions {
  preferredId?: string;
  capabilities?: AgentCapabilityRequirements;
}

const ENFORCEMENT_RANK: Readonly<
  Record<AgentCapabilities["enforcement"], number>
> = {
  none: 0,
  advisory: 1,
  hard: 2,
};

function supportsCapabilities(
  adapter: AgentAdapter,
  requirements: AgentCapabilityRequirements,
): boolean {
  return (
    (requirements.setup === undefined ||
      adapter.capabilities.setup === requirements.setup) &&
    (requirements.contextDelivery === undefined ||
      adapter.capabilities.contextDelivery.includes(
        requirements.contextDelivery,
      )) &&
    (requirements.minimumEnforcement === undefined ||
      ENFORCEMENT_RANK[adapter.capabilities.enforcement] >=
        ENFORCEMENT_RANK[requirements.minimumEnforcement])
  );
}

function unavailableAgent(message: string, details: Record<string, unknown>) {
  return new AutoForgeError("INVALID_ARGUMENT", message, {
    details,
    exitCode: EXIT_CODE.notFound,
  });
}

export class AgentRegistry {
  private readonly adapters: readonly AgentAdapter[];
  private readonly adaptersById: ReadonlyMap<string, AgentAdapter>;

  constructor(adapters: readonly AgentAdapter[]) {
    for (const adapter of adapters) {
      validateAgentAdapterDefinition(adapter);
    }
    const duplicateIds = adapters
      .map((adapter) => adapter.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new AutoForgeError(
        "INVALID_ARGUMENT",
        `Duplicate agent adapter IDs: ${[...new Set(duplicateIds)].join(", ")}`,
        { exitCode: EXIT_CODE.usage },
      );
    }
    this.adapters = [...adapters].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
    this.adaptersById = new Map(
      this.adapters.map((adapter) => [adapter.id, adapter]),
    );
  }

  list(requirements: AgentCapabilityRequirements = {}): AgentAdapter[] {
    return this.adapters.filter((adapter) =>
      supportsCapabilities(adapter, requirements),
    );
  }

  get(id: string): AgentAdapter {
    const adapter = this.adaptersById.get(id);
    if (!adapter) {
      throw unavailableAgent(`Unknown agent adapter: ${id}`, { id });
    }
    return adapter;
  }

  async detect(
    context: AgentAdapterContext,
    requirements: AgentCapabilityRequirements = {},
  ): Promise<DetectedAgent[]> {
    return Promise.all(
      this.list(requirements).map(async (adapter) => ({
        adapter,
        detection: agentDetectionSchema.parse(await adapter.detect(context)),
      })),
    );
  }

  async resolve(
    context: AgentAdapterContext,
    options: ResolveAgentOptions = {},
  ): Promise<DetectedAgent> {
    const requirements = options.capabilities ?? {};
    if (options.preferredId !== undefined) {
      const adapter = this.get(options.preferredId);
      if (!supportsCapabilities(adapter, requirements)) {
        throw unavailableAgent(
          `Agent adapter ${adapter.id} does not satisfy required capabilities`,
          { id: adapter.id, requirements },
        );
      }
      const detection = agentDetectionSchema.parse(
        await adapter.detect(context),
      );
      if (!detection.detected) {
        throw unavailableAgent(`Agent adapter ${adapter.id} was not detected`, {
          id: adapter.id,
          evidence: detection.evidence,
        });
      }
      return { adapter, detection };
    }

    const detections = (await this.detect(context, requirements))
      .filter((candidate) => candidate.detection.detected)
      .sort(
        (left, right) =>
          Number(right.detection.confidence === "high") -
            Number(left.detection.confidence === "high") ||
          left.adapter.id.localeCompare(right.adapter.id),
      );
    const selected = detections[0];
    if (!selected) {
      throw unavailableAgent(
        "No detected agent adapter satisfies the required capabilities",
        { requirements },
      );
    }
    return selected;
  }
}

export function createDefaultAgentRegistry(): AgentRegistry {
  return new AgentRegistry([
    new ClaudeAgentAdapter(),
    new CodexAgentAdapter(),
    new CursorAgentAdapter(),
    new GeminiAgentAdapter(),
    new GenericAgentAdapter(),
    new GrokAgentAdapter(),
  ]);
}
