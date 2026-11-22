import { describe, expect, it } from "vitest";

import {
  agentLauncherInfoSchema,
  PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION,
} from "../src/index.js";

describe("Agent launcher protocol", () => {
  it("accepts only the supported Agent identity and protocol", () => {
    const compatible = {
      name: "@cojacklabs/priozar-agent",
      version: "0.1.0",
      launchProtocolVersion: PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION,
    };
    expect(agentLauncherInfoSchema.safeParse(compatible).success).toBe(true);
    expect(
      agentLauncherInfoSchema.safeParse({
        ...compatible,
        launchProtocolVersion: 2,
      }).success,
    ).toBe(false);
    expect(
      agentLauncherInfoSchema.safeParse({ ...compatible, name: "other" })
        .success,
    ).toBe(false);
  });

  it("still accepts an agent that reports its pre-rename package name", () => {
    expect(
      agentLauncherInfoSchema.safeParse({
        name: "@cojacklabs/autoforge-agent",
        version: "0.1.0",
        launchProtocolVersion: PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION,
      }).success,
    ).toBe(true);
  });
});
