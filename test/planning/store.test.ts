import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { generatePlanningArtifact } from "../../src/planning/artifacts.js";
import { PlanningArtifactStore } from "../../src/planning/store.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("planning artifact store", () => {
  it("persists, reads, and checks generated artifact freshness", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const artifact = generatePlanningArtifact(
      {
        raw: "Build checkout.",
        objective: "Allow payment.",
        requirements: ["Support cards"],
        assumptions: [],
        unknowns: [],
        constraints: [],
        acceptanceCriteria: [],
      },
      "feature-brief",
    );
    const store = new PlanningArtifactStore(projectRoot);
    await expect(store.write(artifact)).resolves.toBe(
      ".autoforge/planning/feature-brief.json",
    );
    await expect(store.read("feature-brief")).resolves.toEqual(artifact);
    await expect(
      store.isFresh("feature-brief", artifact.sourceFingerprint),
    ).resolves.toBe(true);
    await expect(store.isFresh("feature-brief", "0".repeat(64))).resolves.toBe(
      false,
    );
  });
});
