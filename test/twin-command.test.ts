import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { runTwinCommand } from "../src/commands/twin.js";

const roots: string[] = [];

afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("twin command", () => {
  it("generates, shows, and queries a project projection", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-twin-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runTwinCommand({
        args: ["generate", "--json"],
        output,
        startDirectory: root,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      }),
    ).resolves.toBe(0);
    await expect(
      runTwinCommand({ args: ["show"], output, startDirectory: root }),
    ).resolves.toBe(0);
    await expect(
      runTwinCommand({
        args: ["query", "--type", "feature", "--json"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(0);
    expect(output.stderr).not.toHaveBeenCalled();
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"schemaVersion": 1'),
    );
  });
});
