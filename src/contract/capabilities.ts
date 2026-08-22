import { z } from "zod";

export const agentCapabilitySchema = z
  .object({
    agentId: z.string().min(1),
    contextPackets: z.boolean(),
    contractValidation: z.boolean(),
    handoffPersistence: z.boolean(),
  })
  .strict();

export type AgentCapability = z.infer<typeof agentCapabilitySchema>;

const capabilities: readonly AgentCapability[] = [
  {
    agentId: "codex",
    contextPackets: true,
    contractValidation: true,
    handoffPersistence: true,
  },
  {
    agentId: "claude",
    contextPackets: true,
    contractValidation: true,
    handoffPersistence: true,
  },
  {
    agentId: "cursor",
    contextPackets: true,
    contractValidation: true,
    handoffPersistence: true,
  },
  {
    agentId: "gemini",
    contextPackets: true,
    contractValidation: true,
    handoffPersistence: true,
  },
  {
    agentId: "grok",
    contextPackets: true,
    contractValidation: true,
    handoffPersistence: true,
  },
  {
    agentId: "generic",
    contextPackets: true,
    contractValidation: true,
    handoffPersistence: true,
  },
];

export function getAgentCapability(
  agentId: string,
): AgentCapability | undefined {
  return capabilities.find((capability) => capability.agentId === agentId);
}

export function assertAgentContractCompatibility(
  agentId: string,
): AgentCapability {
  const capability = getAgentCapability(agentId);
  if (
    !capability ||
    !capability.contractValidation ||
    !capability.contextPackets
  ) {
    throw new Error(`Agent ${agentId} cannot satisfy the AutoForge contract`);
  }
  return capability;
}
