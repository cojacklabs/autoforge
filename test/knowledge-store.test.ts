import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KnowledgeStore } from "../src/knowledge/store.js";
import { KnowledgeRegistry } from "../src/knowledge/registry.js";

describe("knowledge store", () => {
  it("persists and reloads a registry", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-knowledge-"),
    );
    try {
      await mkdir(path.join(project, ".git"));
      const registry = new KnowledgeRegistry();
      registry.ingest(
        "Vision: Durable memory",
        "test",
        new Date("2026-08-21T00:00:00.000Z"),
      );
      const store = new KnowledgeStore(project);
      const filePath = await store.save(registry);
      expect(await readFile(filePath, "utf8")).toContain('"version": "1"');
      expect((await store.load()).list()).toHaveLength(1);
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });
});
