import { describe, expect, it } from "vitest";
import {
  importStorageBundle,
  projectStorageId,
} from "../src/workspace/tiered-storage.js";

describe("tiered storage import", () => {
  it("rejects bundles for a different canonical project", async () => {
    const project = "/tmp/example-project";
    const bundle = {
      schemaVersion: 1,
      manifest: {
        schemaVersion: 1,
        projectId: projectStorageId("/tmp/other-project"),
        canonicalPath: "/tmp/other-project",
        createdAt: "2026-08-22T12:00:00.000Z",
        updatedAt: "2026-08-22T12:00:00.000Z",
      },
      tiers: [],
    };
    await expect(importStorageBundle(bundle, project)).rejects.toThrow(
      "does not match",
    );
  });
});
