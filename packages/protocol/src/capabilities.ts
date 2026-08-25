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

export const AGENT_CAPABILITIES: readonly AgentCapability[] = [
  "codex",
  "claude",
  "cursor",
  "gemini",
  "grok",
  "generic",
].map((agentId) => ({
  agentId,
  contextPackets: true,
  contractValidation: true,
  handoffPersistence: true,
}));

const AGENT_ALIASES: Readonly<Record<string, string>> = {
  antigravity: "gemini",
  agy: "gemini",
};

export function normalizeAgentId(agentId: string): string {
  return AGENT_ALIASES[agentId] ?? agentId;
}

export function getAgentCapability(
  agentId: string,
): AgentCapability | undefined {
  const canonicalId = normalizeAgentId(agentId);
  return AGENT_CAPABILITIES.find((item) => item.agentId === canonicalId);
}

export function assertAgentContractCompatibility(
  agentId: string,
): AgentCapability {
  const capability = getAgentCapability(agentId);
  if (!capability?.contractValidation || !capability.contextPackets) {
    throw new Error(`Agent ${agentId} cannot satisfy the AutoForge contract`);
  }
  return capability;
}
