import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DomainStore } from "../src/domain/store.js";

describe("domain store", () => {
  it("round-trips validated domain artifacts", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-domain-"),
    );
    try {
      const store = new DomainStore(projectRoot);
      const artifact = {
        id: "domain-artifact.product",
        concepts: [
          {
            id: "domain.user",
            name: "User",
            description: "Account holder.",
            aliases: [],
            provenance: [],
            metadata: {},
            lifecycle: "confirmed" as const,
          },
        ],
        relationships: [],
        invariants: [],
        updatedAt: "2026-08-22T00:00:00Z",
      };
      const filePath = await store.save(artifact);
      expect(filePath).toContain(".autoforge/domain/domain.json");
      await expect(store.load()).resolves.toMatchObject(artifact);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("returns null when no domain artifact has been initialized", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-domain-"),
    );
    try {
      const store = new DomainStore(projectRoot);
      await expect(store.load()).resolves.toBeNull();
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
