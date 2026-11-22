import { describe, expect, it } from "vitest";

import {
  AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION,
  AUTOFORGE_PROTOCOL_VERSION,
  AutoForgeError,
  PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION,
  PRIOZAR_PROTOCOL_VERSION,
  PriozarError,
  autoForgeErrorCodeSchema,
  priozarErrorCodeSchema,
  toAutoForgeError,
  toPriozarError,
} from "../src/index.js";

describe("deprecated AutoForge aliases", () => {
  it("keeps AutoForgeError interchangeable with PriozarError", () => {
    expect(AutoForgeError).toBe(PriozarError);
    const error = new AutoForgeError("INVALID_STATE", "bad");
    expect(error).toBeInstanceOf(PriozarError);
    expect(error.name).toBe("PriozarError");
    expect(toAutoForgeError(error)).toBe(error);
    expect(toAutoForgeError).toBe(toPriozarError);
  });

  it("aliases the error code schema and protocol constants", () => {
    expect(autoForgeErrorCodeSchema).toBe(priozarErrorCodeSchema);
    expect(AUTOFORGE_PROTOCOL_VERSION).toBe(PRIOZAR_PROTOCOL_VERSION);
    expect(AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION).toBe(
      PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION,
    );
  });
});
