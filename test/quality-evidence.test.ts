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

  it("parses legacy evidence records missing the new scope fields", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-legacy-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await store.record({
      id: "evidence.legacy-gate",
      gateId: "tests",
      status: "passed",
      severity: "required",
      traceIds: [],
      reason: "Legacy record with no scope fields.",
      capturedAt: "2026-08-22T00:00:00.000Z",
    });
    const legacyState = await store.read();
    expect(legacyState.evidence).toMatchObject([
      { gateId: "tests", status: "passed" },
    ]);
    expect(legacyState.evidence[0]).not.toHaveProperty("revision");
    expect(legacyState.evidence[0]).not.toHaveProperty("environment");
    expect(legacyState.evidence[0]).not.toHaveProperty(
      "gateDefinitionFingerprint",
    );
  });

  it("persists evidence with revision, environment, and gate-definition scope", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-scoped-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await store.record({
      id: "evidence.scoped-gate",
      gateId: "tests",
      status: "passed",
      severity: "required",
      traceIds: [],
      reason: "Scoped record.",
      capturedAt: "2026-08-22T00:00:00.000Z",
      revision: { sha: "abc1234def5678", dirty: false },
      environment: { platform: "darwin", nodeMajor: 22, ci: false },
      gateDefinitionFingerprint: "fingerprint-value",
    });
    await expect(store.read()).resolves.toMatchObject({
      evidence: [
        {
          revision: { sha: "abc1234def5678", dirty: false },
          environment: { platform: "darwin", nodeMajor: 22, ci: false },
          gateDefinitionFingerprint: "fingerprint-value",
        },
      ],
    });
  });

  it("rejects a dirty flag that is not a boolean", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-invalid-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await expect(
      store.record({
        id: "evidence.invalid-gate",
        gateId: "tests",
        status: "passed",
        severity: "required",
        traceIds: [],
        reason: "Invalid record.",
        capturedAt: "2026-08-22T00:00:00.000Z",
        // @ts-expect-error - intentionally invalid for the runtime check
        revision: { sha: "abc1234", dirty: "not-a-boolean" },
      }),
    ).rejects.toThrow();
  });
});
