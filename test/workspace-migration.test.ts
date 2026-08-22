import { describe, expect, it } from "vitest";
import {
  migrateGlobalWorkspaceConfig,
  normalizeProjectMetadata,
} from "../src/workspace/global-store.js";

describe("global workspace metadata migration", () => {
  it("normalizes legacy metadata with safe defaults", () => {
    expect(
      normalizeProjectMetadata({
        name: "legacy",
        lastSeen: "2026-08-22T12:00:00.000Z",
      }),
    ).toMatchObject({ lifecycle: "active", aliases: [] });
  });

  it("migrates all registered metadata without changing paths", () => {
    const migrated = migrateGlobalWorkspaceConfig({
      version: "0.11.0",
      projects: ["/tmp/legacy"],
      projectMetadata: {
        "/tmp/legacy": {
          name: "legacy",
          lastSeen: "2026-08-22T12:00:00.000Z",
        },
      },
    });
    expect(migrated.projects).toEqual(["/tmp/legacy"]);
    expect(migrated.projectMetadata?.["/tmp/legacy"]?.lifecycle).toBe("active");
  });
});
