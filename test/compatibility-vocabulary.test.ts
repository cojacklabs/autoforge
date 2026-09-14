import { describe, expect, it } from "vitest";

import {
  FRAMEWORK_IDENTITY,
  frameworkExecutableSchema,
  stateDirectorySchema,
} from "@cojacklabs/autoforge-protocol";

describe("framework compatibility vocabulary", () => {
  it("exports centralized framework identity for AutoForge and successor Priozar", () => {
    expect(FRAMEWORK_IDENTITY.current.product).toBe("AutoForge");
    expect(FRAMEWORK_IDENTITY.current.executable).toBe("autoforge");
    expect(FRAMEWORK_IDENTITY.current.stateDirectory).toBe(".autoforge");

    expect(FRAMEWORK_IDENTITY.successor.product).toBe("Priozar");
    expect(FRAMEWORK_IDENTITY.successor.executable).toBe("priozar");
    expect(FRAMEWORK_IDENTITY.successor.stateDirectory).toBe(".priozar");
    expect(FRAMEWORK_IDENTITY.successor.cliPackage).toBe("@cojacklabs/priozar");
    expect(FRAMEWORK_IDENTITY.successor.corePackage).toBe("@cojacklabs/priozar-core");
    expect(FRAMEWORK_IDENTITY.successor.protocolPackage).toBe("@cojacklabs/priozar-protocol");
    expect(FRAMEWORK_IDENTITY.successor.sdkPackage).toBe("@cojacklabs/priozar-sdk");
    expect(FRAMEWORK_IDENTITY.successor.domain).toBe("priozar.sh");
  });

  it("validates supported executables and state directories", () => {
    expect(frameworkExecutableSchema.parse("autoforge")).toBe("autoforge");
    expect(frameworkExecutableSchema.parse("priozar")).toBe("priozar");
    expect(() => frameworkExecutableSchema.parse("forger")).toThrow();

    expect(stateDirectorySchema.parse(".autoforge")).toBe(".autoforge");
    expect(stateDirectorySchema.parse(".priozar")).toBe(".priozar");
    expect(() => stateDirectorySchema.parse(".forger")).toThrow();
  });
});
