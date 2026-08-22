import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { ValidationEvidenceStore } from "../src/quality/evidence.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("validation evidence", () => {
  it("persists deterministic gate evidence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-evidence-"));
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await store.record({
      id: "evidence.gate-tests",
      gateId: "tests",
      status: "passed",
      severity: "required",
      traceIds: ["trace.intent-design"],
      reason: "All tests passed.",
      capturedAt: "2026-08-22T00:00:00.000Z",
    });
    await expect(store.read()).resolves.toMatchObject({
      schemaVersion: 1,
      evidence: [{ gateId: "tests", status: "passed" }],
    });
  });
});
