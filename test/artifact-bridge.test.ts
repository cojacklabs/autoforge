import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { registerArtifactReference } from "../src/artifacts/bridge.js";
import { FileProjectArtifactRepository } from "../src/artifacts/store.js";

const directories: string[] = [];
afterEach(async () =>
  Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  ),
);

describe("artifact compatibility bridge", () => {
  it("registers generated references idempotently with supplied provenance", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-artifact-bridge-"),
    );
    directories.push(root);
    const input = {
      id: "artifact.handoff.example",
      kind: "handoff" as const,
      title: "Example handoff",
      agentId: "claude",
      workId: "issue.artifacts",
      path: ".autoforge/handoffs/handoff.example.json",
      revision: { sha: "abc123", worktreeFingerprint: "a".repeat(64) },
    };
    await registerArtifactReference(root, input);
    await registerArtifactReference(root, input);
    await expect(
      new FileProjectArtifactRepository(root).list(),
    ).resolves.toEqual([
      expect.objectContaining({
        id: input.id,
        agentId: "claude",
        workId: "issue.artifacts",
        content: { type: "reference", path: input.path },
        sourceRevision: { gitHead: "abc123", dirtyFingerprint: "a".repeat(64) },
      }),
    ]);
  });
});
