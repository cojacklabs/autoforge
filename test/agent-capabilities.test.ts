import { describe, expect, it } from "vitest";

import {
  assertAgentContractCompatibility,
  getAgentCapability,
} from "../src/contract/capabilities.js";

describe("agent capabilities", () => {
  it("supports the canonical adapter targets", () => {
    expect(getAgentCapability("codex")).toMatchObject({
      contextPackets: true,
      contractValidation: true,
    });
    expect(assertAgentContractCompatibility("generic").handoffPersistence).toBe(
      true,
    );
  });

  it("covers every supported agent adapter", () => {
    for (const agentId of [
      "codex",
      "claude-code",
      "cursor",
      "gemini",
      "antigravity",
      "generic",
    ]) {
      expect(assertAgentContractCompatibility(agentId).agentId).toBe(agentId);
    }
  });

  it("rejects unknown agents", () => {
    expect(() => assertAgentContractCompatibility("unknown")).toThrow(
      "cannot satisfy",
    );
  });
});
