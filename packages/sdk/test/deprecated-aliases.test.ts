import { describe, expect, it } from "vitest";

import {
  AutoForgeSdk,
  PriozarSdk,
  createAutoForgeSdk,
  createPriozarSdk,
} from "../src/index.js";

describe("deprecated AutoForge SDK aliases", () => {
  it("exports the same class and factory under the old names", () => {
    expect(AutoForgeSdk).toBe(PriozarSdk);
    expect(createAutoForgeSdk).toBe(createPriozarSdk);
  });
});
