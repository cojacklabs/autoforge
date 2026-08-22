import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  projectStorageId,
  projectStorageTierPath,
  inspectGlobalStorage,
  StorageManifestStore,
} from "../src/workspace/tiered-storage.js";

describe("tiered global storage", () => {
  it("derives stable project tiers and persists a manifest", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-storage-"));
    try {
      const project = "/tmp/example-project";
      expect(projectStorageId(project)).toMatch(/^project\.[a-f0-9]{16}$/);
      expect(projectStorageTierPath(project, "history", home)).toContain(
        path.join(".autoforge", "projects"),
      );
      const store = new StorageManifestStore(project, home);
      expect(await store.read()).toBeNull();
      const manifest = await store.write(new Date("2026-08-22T12:00:00.000Z"));
      expect(manifest.projectId).toBe(projectStorageId(project));
      expect(await store.read()).toEqual(manifest);
      await expect(inspectGlobalStorage(project, home)).resolves.toHaveLength(
        5,
      );
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });
});
