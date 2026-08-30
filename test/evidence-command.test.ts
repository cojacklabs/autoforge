import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { runEvidenceCommand } from "../src/commands/evidence.js";
import { ValidationEvidenceStore } from "../src/quality/evidence.js";
import {
  computeCurrentEnvironment,
  computeGateDefinitionFingerprints,
  expectedRequiredGateIds,
} from "../src/quality/scope.js";

const execFileAsync = promisify(execFile);
const roots: string[] = [];

async function recordBuiltInEvidence(
  root: string,
  statusForGate: Partial<Record<string, "passed" | "failed">> = {},
  fingerprintForGate: Partial<Record<string, string>> = {},
): Promise<void> {
  const gateIds = expectedRequiredGateIds([]);
  const fingerprints = await computeGateDefinitionFingerprints(gateIds, {
    qualityGates: [],
  });
  const environment = computeCurrentEnvironment();
  const store = new ValidationEvidenceStore(root);
  for (const [index, gateId] of gateIds.entries()) {
    const status = statusForGate[gateId] ?? "passed";
    await store.record({
      id: `evidence.${gateId}.baseline-${index}`,
      gateId,
      status,
      severity: "required",
      traceIds: [],
      reason: `${gateId} ${status}.`,
      capturedAt: `2026-08-22T00:00:0${index}.000Z`,
      environment,
      gateDefinitionFingerprint:
        fingerprintForGate[gateId] ?? fingerprints[gateId],
    });
  }
}
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("evidence command", () => {
  it("summarizes required failures", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    await recordBuiltInEvidence(root, { installation: "failed" });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runEvidenceCommand({
        args: ["summary", "--json"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(4);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"requiredFailures": 1'),
    );
  });

  it("reports a later passing rerun as authoritative without deleting failure history", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await recordBuiltInEvidence(root);
    const environment = computeCurrentEnvironment();
    const fingerprints = await computeGateDefinitionFingerprints(
      expectedRequiredGateIds([]),
      { qualityGates: [] },
    );
    await store.record({
      id: "evidence.installation.failed",
      gateId: "installation",
      status: "failed",
      severity: "required",
      traceIds: [],
      reason: "Tests failed.",
      capturedAt: "2026-08-22T00:01:00.000Z",
      environment,
      gateDefinitionFingerprint: fingerprints.installation,
    });
    await store.record({
      id: "evidence.installation.passed",
      gateId: "installation",
      status: "passed",
      severity: "required",
      traceIds: [],
      reason: "Tests passed.",
      capturedAt: "2026-08-22T00:02:00.000Z",
      environment,
      gateDefinitionFingerprint: fingerprints.installation,
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runEvidenceCommand({
        args: ["summary", "--json"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(0);
    const summary = JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "");
    expect(summary).toMatchObject({
      ready: true,
      total: 6,
      failed: 1,
      effectiveTotal: 4,
      effectivePassed: 4,
      requiredFailures: 0,
    });
    expect(summary.authoritativeEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceId: "evidence.installation.passed",
          supersedes: [
            "evidence.installation.baseline-1",
            "evidence.installation.failed",
          ],
        }),
      ]),
    );
    await expect(store.read()).resolves.toMatchObject({
      evidence: [
        { id: "evidence.file-access.baseline-0" },
        { id: "evidence.installation.baseline-1" },
        { id: "evidence.installation.failed" },
        { id: "evidence.installation.passed" },
        { id: "evidence.secret-scan.baseline-2" },
        { id: "evidence.structured-syntax.baseline-3" },
      ],
    });
  });

  it("excludes out-of-scope evidence from the summary and reports the count", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-command-scope-"),
    );
    roots.push(root);
    await execFileAsync("git", ["-C", root, "init", "-q"]);
    await execFileAsync("git", [
      "-C",
      root,
      "config",
      "user.email",
      "test@example.com",
    ]);
    await execFileAsync("git", ["-C", root, "config", "user.name", "Test"]);
    await initializeProject({ projectRoot: root });
    await execFileAsync("git", ["-C", root, "add", "."]);
    await execFileAsync("git", ["-C", root, "commit", "-q", "-m", "initial"]);
    const store = new ValidationEvidenceStore(root);
    await store.record({
      id: "evidence.tests.old-revision",
      gateId: "tests",
      status: "passed",
      severity: "required",
      traceIds: [],
      reason: "Old revision result.",
      capturedAt: "2026-08-22T00:00:00.000Z",
      revision: { sha: "definitely-not-current-sha", dirty: false },
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runEvidenceCommand({
        args: ["summary", "--json"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(4);
    const summary = JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "");
    expect(summary.outOfScopeCount).toBe(1);
    expect(summary.outOfScopeReasons[0]).toContain(
      "evidence.tests.old-revision",
    );
    expect(summary.effectiveTotal).toBe(0);
    expect(summary.ready).toBe(false);
    expect(summary.missingGateIds).toEqual(
      expect.arrayContaining([
        "installation",
        "file-access",
        "secret-scan",
        "structured-syntax",
      ]),
    );
  });

  it("requires fresh evidence when a gate definition changes", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-command-definition-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    await recordBuiltInEvidence(root, {}, { installation: "stale" });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runEvidenceCommand({
        args: ["summary", "--json"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(4);
    const summary = JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "");
    expect(summary.ready).toBe(false);
    expect(summary.missingGateIds).toContain("installation");
    expect(summary.outOfScopeReasons).toContain(
      "evidence.installation.baseline-1: different gate definition",
    );
  });
});
