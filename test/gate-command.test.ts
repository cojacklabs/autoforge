import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

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
const execFileAsync = promisify(execFile);

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
    const simulatedCredential = ["abcdefgh", "ijklmnop"].join("");
    const unsafeLine = ["pass", 'word = "', simulatedCredential, '"\n'].join(
      "",
    );
    await writeFile(path.join(projectRoot, "unsafe.txt"), unsafeLine);
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
      simulatedCredential,
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

  it("selects changed files inside the active work scope when paths are omitted", async () => {
    const projectRoot = await createProject();
    await mkdir(path.join(projectRoot, "src", "generated"), {
      recursive: true,
    });
    await writeFile(path.join(projectRoot, "src", "app.ts"), "export {};\n");
    await writeFile(
      path.join(projectRoot, "src", "generated", "client.ts"),
      "export {};\n",
    );
    const issue = await new WorkService(
      createWorkStateStore(projectRoot),
    ).createIssue({
      name: "Scoped validation",
      description: "Validate changed source files.",
      scope: { include: ["src/**"], exclude: ["src/generated/**"] },
    });
    await runStartCommand({
      args: ["issue", issue.entity.id],
      output: { stdout: () => {}, stderr: () => {} },
      startDirectory: projectRoot,
    });
    const changedFileReader = vi
      .fn()
      .mockResolvedValue([
        "docs/notes.md",
        "src/generated/client.ts",
        "src/app.ts",
      ]);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runGateCommand({
        args: ["check", "--json"],
        output,
        startDirectory: projectRoot,
        changedFileReader,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    expect(changedFileReader).toHaveBeenCalledWith(projectRoot);
    expect(JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "").files).toEqual([
      "src/app.ts",
    ]);
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

describe("gate check evidence scope", () => {
  it("records revision, environment, and gate-definition scope on captured evidence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-gate-scope-"));
    temporaryDirectories.push(root);
    await execFileAsync("git", ["-C", root, "init", "-q"]);
    await execFileAsync("git", [
      "-C",
      root,
      "config",
      "user.email",
      "test@example.com",
    ]);
    await execFileAsync("git", ["-C", root, "config", "user.name", "Test"]);
    await initializeProject({ projectRoot: root, projectId: PROJECT_ID });
    await execFileAsync("git", ["-C", root, "add", "."]);
    await execFileAsync("git", ["-C", root, "commit", "-q", "-m", "initial"]);

    await runGateCommand({
      args: ["check"],
      output: { stdout: vi.fn(), stderr: vi.fn() },
      startDirectory: root,
      changedFileReader: async () => [],
    });

    const state = await new ValidationEvidenceStore(root).read();
    expect(state.evidence.length).toBeGreaterThan(0);
    for (const item of state.evidence) {
      expect(item.revision).toMatchObject({ dirty: false });
      expect(item.revision?.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(item.environment).toMatchObject({
        platform: process.platform,
      });
      expect(item.gateDefinitionFingerprint).toBeTruthy();
    }
  });
});
