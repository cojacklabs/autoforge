import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectProjectInventory } from "../src/workspace/inventory.js";

describe("project inventory", () => {
  it("classifies project documentation and planning artifacts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-inventory-"));
    try {
      await mkdir(path.join(root, "dev"), { recursive: true });
      await mkdir(path.join(root, ".autoforge"), { recursive: true });
      await writeFile(path.join(root, "README.md"), "# Project");
      await writeFile(path.join(root, "dev", "plan.md"), "# Plan");
      await writeFile(path.join(root, ".autoforge", "config.json"), "{}");
      const inventory = await inspectProjectInventory(root);
      expect(inventory.files).toBe(3);
      expect(inventory.categories.documentation).toBe(1);
      expect(inventory.categories.planning).toBe(1);
      expect(inventory.categories.autoforge).toBe(1);
      expect(inventory.highlights).toContain("README.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
