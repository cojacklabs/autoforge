import { z } from "zod";

export const PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION = 1 as const;
export const PRIOZAR_AGENT_RECURSION_ENV = "PRIOZAR_AGENT_LAUNCHED";

/** @deprecated Use PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION. */
export const AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION =
  PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION;
/**
 * @deprecated Use PRIOZAR_AGENT_RECURSION_ENV. Older launchers and agents only
 * know this name, so it is still set and honoured during the compatibility window.
 */
export const AUTOFORGE_AGENT_RECURSION_ENV = "AUTOFORGE_AGENT_LAUNCHED";

export const agentLauncherInfoSchema = z
  .object({
    // An agent from before the rename still reports its original package name.
    name: z.enum(["@cojacklabs/priozar-agent", "@cojacklabs/autoforge-agent"]),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    launchProtocolVersion: z.literal(PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION),
  })
  .strict();

export type AgentLauncherInfo = z.infer<typeof agentLauncherInfoSchema>;
