import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { runEvidenceCommand } from "../src/commands/evidence.js";
import { ValidationEvidenceStore } from "../src/quality/evidence.js";

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
});
