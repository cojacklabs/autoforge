import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runGateCommand } from "../src/commands/gate.js";
import { initializeProject } from "../src/commands/init.js";
import { runStartCommand } from "../src/commands/start.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { ValidationEvidenceStore } from "../src/quality/evidence.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const PROJECT_ID = "f45b8e3d-e9d8-465b-8489-3bc5e5e5a4dd";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-gate-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot, projectId: PROJECT_ID });
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("gate command", () => {
  it("prints a machine-readable passing report", async () => {
    const projectRoot = await createProject();
    await writeFile(path.join(projectRoot, "valid.json"), '{"valid":true}\n');
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runGateCommand({
        args: ["check", "--path", "valid.json", "--json"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stderr).not.toHaveBeenCalled();
    expect(JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "")).toMatchObject({
      success: true,
      files: ["valid.json"],
    });
  });

  it("returns invalid state and redacts a failed secret check", async () => {
    const projectRoot = await createProject();
    await writeFile(
      path.join(projectRoot, "unsafe.txt"),
      'password = "abcdefghijklmnop"\n',
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runGateCommand({
        args: ["check", "--files", "unsafe.txt"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.invalidState);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("potential secret"),
    );
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("value redacted"),
    );
    expect(JSON.stringify(output.stderr.mock.calls)).not.toContain(
      "abcdefghijklmnop",
    );
  });

  it("stamps recorded evidence with the active work item's id", async () => {
    const projectRoot = await createProject();
    const workStore = createWorkStateStore(projectRoot);
    const workService = new WorkService(workStore);
    const issue = await workService.createIssue({
      name: "Slow index",
      description: "Indexing is slow.",
      scope: { include: ["src/search/**"], exclude: [] },
    });

    const startOutput = { stdout: () => {}, stderr: () => {} };
    await runStartCommand({
      args: ["issue", issue.entity.id],
      output: startOutput,
      startDirectory: projectRoot,
    });

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runGateCommand({
        args: ["check"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const evidenceState = await new ValidationEvidenceStore(projectRoot).read();
    expect(evidenceState.evidence.length).toBeGreaterThan(0);
    for (const record of evidenceState.evidence) {
      expect(record.workId).toBe(issue.entity.id);
    }
  });

  it("records evidence with no work id when no work item is active", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runGateCommand({
        args: ["check"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const evidenceState = await new ValidationEvidenceStore(projectRoot).read();
    expect(evidenceState.evidence.length).toBeGreaterThan(0);
    for (const record of evidenceState.evidence) {
      expect(record.workId).toBeUndefined();
    }
  });

  it.each([
    { args: [], message: "requires" },
    { args: ["run"], message: "requires" },
    { args: ["check", "--path"], message: "requires" },
    { args: ["check", "--unknown"], message: "Unknown" },
  ])("rejects invalid arguments for $args", async ({ args, message }) => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runGateCommand({ args, output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining(message),
    );
  });
});
