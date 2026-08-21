import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConstitutionStore } from "../src/governance/store.js";

describe("constitution store", () => {
  it("persists and reloads a validated constitution", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-governance-"),
    );
    try {
      await mkdir(path.join(project, ".git"));
      const constitution = {
        id: "constitution.product.release-scope",
        name: "Release scope",
        purpose: "Protect approved release boundaries.",
        rules: [
          {
            id: "constitution.release.no-billing",
            title: "Billing is out of scope",
            statement: "Billing MUST NOT be implemented in Release A.",
            level: "MUST_NOT" as const,
            enforcement: "hard" as const,
            scope: {
              paths: [],
              workKinds: ["implementation"],
              releases: ["A"],
              tags: [],
            },
            rationale: "Release A validates candidate discovery first.",
            nonGoals: ["Subscription checkout"],
          },
        ],
        source: "human-approved",
        updatedAt: "2026-08-21T00:00:00.000Z",
      };
      const store = new ConstitutionStore(project);
      await store.save(constitution);
      await expect(store.load()).resolves.toEqual(constitution);
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });
});
