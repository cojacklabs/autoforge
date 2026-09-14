import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileProjectArtifactRepository } from "../src/artifacts/store.js";

const artifact = {
  schemaVersion: "1" as const,
  id: "artifact.plan",
  kind: "plan" as const,
  title: "Plan",
  status: "draft" as const,
  agentId: "codex",
  workId: "issue.artifacts",
  createdAt: "2026-09-13T00:00:00.000Z",
  sourceRevision: { gitHead: "abc123", dirtyFingerprint: null },
  content: { type: "reference" as const, path: "docs/plan.md" },
  approval: null,
  supersedes: null,
};

describe("FileProjectArtifactRepository", () => {
  it("reads absent state and atomically writes valid state", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-artifacts-"));
    const repository = new FileProjectArtifactRepository(root);
    await expect(repository.list()).resolves.toEqual([]);
    await repository.writeAll([artifact]);
    await expect(repository.read(artifact.id)).resolves.toEqual(artifact);
    expect(
      JSON.parse(
        await readFile(
          path.join(root, ".autoforge/artifacts/registry.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({ schemaVersion: "1", artifacts: [artifact] });
  });

  it("rejects duplicate and unsafe persisted artifacts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-artifacts-"));
    const repository = new FileProjectArtifactRepository(root);
    await expect(repository.writeAll([artifact, artifact])).rejects.toThrow(
      "Duplicate artifact id",
    );
    await repository.writeAll([artifact]);
    const file = path.join(root, ".autoforge/artifacts/registry.json");
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: "1",
        artifacts: [
          { ...artifact, content: { type: "reference", path: "../outside" } },
        ],
      }),
    );
    await expect(repository.list()).rejects.toThrow();
  });
});
