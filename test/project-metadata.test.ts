import { describe, expect, it } from "vitest";
import { projectMetadataSchema } from "../src/workspace/global-store.js";

describe("project metadata", () => {
  it("accepts optional lifecycle and control metadata", () => {
    const metadata = projectMetadataSchema.parse({
      name: "autoforge",
      lastSeen: "2026-08-22T12:00:00.000Z",
      lifecycle: "active",
      aliases: ["forge"],
      packageManager: "pnpm",
      runtime: "node20",
      capabilities: ["digital-twin"],
    });
    expect(metadata.lifecycle).toBe("active");
    expect(metadata.capabilities).toEqual(["digital-twin"]);
  });

  it("rejects unsupported lifecycle values", () => {
    expect(() =>
      projectMetadataSchema.parse({
        name: "autoforge",
        lastSeen: "2026-08-22T12:00:00.000Z",
        lifecycle: "deleted",
      }),
    ).toThrow();
  });
});
