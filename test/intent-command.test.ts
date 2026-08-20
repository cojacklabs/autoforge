import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runIntentCommand } from "../src/commands/intent.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-intent-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("intent command", () => {
  it("assesses a project-contained intent and emits planning artifacts", async () => {
    const projectRoot = await createProject();
    await writeFile(
      path.join(projectRoot, "intent.json"),
      JSON.stringify({
        raw: "Build checkout.",
        objective: "Allow customers to pay.",
        requirements: ["Support cards"],
        assumptions: [],
        unknowns: [],
        constraints: [],
        acceptanceCriteria: ["Successful payments are recorded."],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runIntentCommand({
        args: [
          "assess",
          "intent.json",
          "--kind",
          "implementation",
          "--artifact",
          "feature-brief",
          "--persist",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const result = JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "{}");
    expect(result.triage.labels).toEqual(["READY_FOR_IMPLEMENTATION"]);
    expect(result.readiness.level).toBe("ready");
    expect(result.artifacts[0].kind).toBe("feature-brief");
    expect(result.persisted).toEqual([
      ".autoforge/planning/feature-brief.json",
    ]);
  });

  it("rejects malformed command arguments", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runIntentCommand({
        args: ["assess", "intent.json"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
