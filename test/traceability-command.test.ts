import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { runTraceabilityCommand } from "../src/commands/traceability.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("trace command", () => {
  it("adds, lists, and traverses links", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-trace-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTraceabilityCommand({
        args: ["add", "intent.a", "drives", "design.a"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(0);
    await expect(
      runTraceabilityCommand({
        args: ["impact", "intent.a", "--direction", "forward"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenLastCalledWith("design.a (depth 1)");
  });

  it("reports unresolved specification targets", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-trace-check-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runTraceabilityCommand({
      args: ["add", "intent.missing", "drives", "design.missing"],
      output,
      startDirectory: root,
    });
    await expect(
      runTraceabilityCommand({ args: ["check"], output, startDirectory: root }),
    ).resolves.toBe(4);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("unresolved specification"),
    );
  });
});
