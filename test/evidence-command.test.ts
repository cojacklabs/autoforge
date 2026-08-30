import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { runEvidenceCommand } from "../src/commands/evidence.js";
import { ValidationEvidenceStore } from "../src/quality/evidence.js";

const execFileAsync = promisify(execFile);
const roots: string[] = [];
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
    await new ValidationEvidenceStore(root).record({
      id: "evidence.tests",
      gateId: "tests",
      status: "failed",
      severity: "required",
      traceIds: [],
      reason: "Tests failed.",
      capturedAt: "2026-08-22T00:00:00.000Z",
    });
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
    await store.record({
      id: "evidence.tests.failed",
      gateId: "tests",
      status: "failed",
      severity: "required",
      workId: "issue.checkout",
      traceIds: [],
      reason: "Tests failed.",
      capturedAt: "2026-08-22T00:00:00.000Z",
    });
    await store.record({
      id: "evidence.tests.passed",
      gateId: "tests",
      status: "passed",
      severity: "required",
      workId: "issue.checkout",
      traceIds: [],
      reason: "Tests passed.",
      capturedAt: "2026-08-22T00:01:00.000Z",
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
      total: 2,
      failed: 1,
      effectiveTotal: 1,
      effectivePassed: 1,
      requiredFailures: 0,
      authoritativeEvidence: [
        {
          evidenceId: "evidence.tests.passed",
          supersedes: ["evidence.tests.failed"],
        },
      ],
    });
    await expect(store.read()).resolves.toMatchObject({
      evidence: [
        { id: "evidence.tests.failed" },
        { id: "evidence.tests.passed" },
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
    ).resolves.toBe(0);
    const summary = JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "");
    expect(summary.outOfScopeCount).toBe(1);
    expect(summary.outOfScopeReasons[0]).toContain(
      "evidence.tests.old-revision",
    );
    expect(summary.effectiveTotal).toBe(0);
  });
});
