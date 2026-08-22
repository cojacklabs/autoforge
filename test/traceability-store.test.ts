import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { TraceabilityStore } from "../src/traceability/store.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("traceability store", () => {
  it("persists links deterministically", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-trace-"));
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new TraceabilityStore(root);
    await store.add({
      id: "trace.intent-to-design",
      sourceId: "intent.checkout",
      targetId: "screen.checkout",
      relationship: "drives",
      provenance: "human-approved",
      capturedAt: "2026-08-22T00:00:00.000Z",
    });
    await expect(store.read()).resolves.toMatchObject({
      schemaVersion: 1,
      links: [{ id: "trace.intent-to-design" }],
    });
  });
});
