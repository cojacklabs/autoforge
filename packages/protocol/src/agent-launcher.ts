import { z } from "zod";

export const AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION = 1 as const;
export const AUTOFORGE_AGENT_RECURSION_ENV = "AUTOFORGE_AGENT_LAUNCHED";

export const agentLauncherInfoSchema = z
  .object({
    name: z.literal("@cojacklabs/autoforge-agent"),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    launchProtocolVersion: z.literal(AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION),
  })
  .strict();

export type AgentLauncherInfo = z.infer<typeof agentLauncherInfoSchema>;
