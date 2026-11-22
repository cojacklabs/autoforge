import { z } from "zod";

export const PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION = 1 as const;
export const PRIOZAR_AGENT_RECURSION_ENV = "AUTOFORGE_AGENT_LAUNCHED";

/** @deprecated Use PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION. */
export const AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION =
  PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION;
/** @deprecated Use PRIOZAR_AGENT_RECURSION_ENV. */
export const AUTOFORGE_AGENT_RECURSION_ENV = PRIOZAR_AGENT_RECURSION_ENV;

export const agentLauncherInfoSchema = z
  .object({
    name: z.literal("@cojacklabs/autoforge-agent"),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    launchProtocolVersion: z.literal(PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION),
  })
  .strict();

export type AgentLauncherInfo = z.infer<typeof agentLauncherInfoSchema>;
