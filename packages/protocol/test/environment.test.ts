import { describe, expect, it } from "vitest";

import { frameworkEnvNames, readFrameworkEnv } from "../src/index.js";

describe("framework environment variables", () => {
  it("names both the canonical and the deprecated variable", () => {
    expect(frameworkEnvNames("NO_AGENT")).toEqual({
      canonical: "PRIOZAR_NO_AGENT",
      deprecated: "AUTOFORGE_NO_AGENT",
    });
  });

  it("prefers the PRIOZAR_ variable over the AUTOFORGE_ one", () => {
    expect(
      readFrameworkEnv("HOME", {
        PRIOZAR_HOME: "/new",
        AUTOFORGE_HOME: "/old",
      }),
    ).toBe("/new");
  });

  it("falls back to the AUTOFORGE_ variable when the new one is unset", () => {
    expect(readFrameworkEnv("HOME", { AUTOFORGE_HOME: "/old" })).toBe("/old");
  });

  it("returns undefined when neither is set", () => {
    expect(readFrameworkEnv("HOME", {})).toBeUndefined();
  });

  it("treats an explicitly empty PRIOZAR_ variable as set", () => {
    expect(
      readFrameworkEnv("HOME", { PRIOZAR_HOME: "", AUTOFORGE_HOME: "/old" }),
    ).toBe("");
  });
});
