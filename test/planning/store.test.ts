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

const baseIntent = {
  raw: "Build checkout.",
  objective: "Allow payment.",
  requirements: ["Support cards"],
  assumptions: [],
  unknowns: [],
  constraints: [],
  acceptanceCriteria: [],
};

describe("planning artifact store", () => {
  it("persists to a fingerprint-namespaced path, reads, and checks freshness", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const artifact = generatePlanningArtifact(baseIntent, "feature-brief");
    const store = new PlanningArtifactStore(projectRoot);
    const writtenPath = await store.write(artifact);
    expect(writtenPath).toBe(
      `.autoforge/planning/feature-brief/${artifact.sourceFingerprint}.json`,
    );
    await expect(store.read("feature-brief")).resolves.toEqual(artifact);
    await expect(
      store.read("feature-brief", artifact.sourceFingerprint),
    ).resolves.toEqual(artifact);
    await expect(
      store.isFresh("feature-brief", artifact.sourceFingerprint),
    ).resolves.toBe(true);
    await expect(store.isFresh("feature-brief", "0".repeat(64))).resolves.toBe(
      false,
    );
  });

  it("returns null when an artifact kind has not been generated", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    await expect(store.read("feature-brief")).resolves.toBeNull();
    await expect(
      store.read("feature-brief", "0".repeat(64)),
    ).resolves.toBeNull();
    await expect(store.isFresh("feature-brief", "0".repeat(64))).resolves.toBe(
      false,
    );
  });

  it("does not overwrite a prior artifact of the same kind with a different source", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    const first = generatePlanningArtifact(
      baseIntent,
      "feature-brief",
      new Date("2026-08-22T00:00:00.000Z"),
    );
    const second = generatePlanningArtifact(
      { ...baseIntent, objective: "Allow refunds." },
      "feature-brief",
      new Date("2026-08-22T01:00:00.000Z"),
    );
    await store.write(first);
    await store.write(second);
    await expect(
      store.read("feature-brief", first.sourceFingerprint),
    ).resolves.toEqual(first);
    await expect(
      store.read("feature-brief", second.sourceFingerprint),
    ).resolves.toEqual(second);
  });

  it("read without a fingerprint returns the most recently generated version", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    const older = generatePlanningArtifact(
      baseIntent,
      "feature-brief",
      new Date("2026-08-22T00:00:00.000Z"),
    );
    const newer = generatePlanningArtifact(
      { ...baseIntent, objective: "Allow refunds." },
      "feature-brief",
      new Date("2026-08-22T02:00:00.000Z"),
    );
    await store.write(older);
    await store.write(newer);
    await expect(store.read("feature-brief")).resolves.toEqual(newer);
  });

  it("listVersions returns every stored version of a kind, newest first", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    const older = generatePlanningArtifact(
      baseIntent,
      "feature-brief",
      new Date("2026-08-22T00:00:00.000Z"),
    );
    const newer = generatePlanningArtifact(
      { ...baseIntent, objective: "Allow refunds." },
      "feature-brief",
      new Date("2026-08-22T02:00:00.000Z"),
    );
    await store.write(older);
    await store.write(newer);
    await expect(store.listVersions("feature-brief")).resolves.toEqual([
      newer,
      older,
    ]);
  });

  it("listVersions returns an empty array for an ungenerated kind", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-store-"),
    );
    directories.push(projectRoot);
    const store = new PlanningArtifactStore(projectRoot);
    await expect(store.listVersions("feature-brief")).resolves.toEqual([]);
  });
});
