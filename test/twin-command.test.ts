import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import { runLearningHypothesisCommand } from "../src/commands/learning-hypothesis.js";
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

  it("includes hypothesis nodes in the generated projection", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-twin-command-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const learningOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runLearningHypothesisCommand({
        args: [
          "add",
          "--statement",
          "A shorter onboarding flow increases activation.",
          "--expected-outcome",
          "Activation rate increases.",
          "--metric",
          "activation-rate",
          "--target",
          "10%",
        ],
        output: learningOutput,
        startDirectory: root,
      }),
    ).resolves.toBe(0);

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTwinCommand({
        args: ["generate", "--json"],
        output,
        startDirectory: root,
        now: () => new Date("2026-08-22T12:00:00.000Z"),
      }),
    ).resolves.toBe(0);

    const call = output.stdout.mock.calls.find(([value]) =>
      typeof value === "string" ? value.includes('"schemaVersion"') : false,
    );
    expect(call).toBeDefined();
    const projection = JSON.parse(call![0] as string);
    expect(
      projection.nodes.some(
        (node: { type: string }) => node.type === "hypothesis",
      ),
    ).toBe(true);
  });
});
