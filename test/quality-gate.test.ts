import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { AutoForgeError } from "../src/core/errors.js";
import { runQualityCommand, runQualityGate } from "../src/quality/service.js";
import { qualityGateReportSchema } from "../src/quality/schemas.js";

const PROJECT_ID = "f45b8e3d-e9d8-465b-8489-3bc5e5e5a4dd";
const TIMESTAMP = "2026-08-20T12:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-quality-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({
    projectRoot,
    projectId: PROJECT_ID,
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "quality",
  });
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("quality gate service", () => {
  it("validates contained JSON and YAML without mutating files", async () => {
    const projectRoot = await createProject();
    const jsonPath = path.join(projectRoot, "config", "valid.json");
    const yamlPath = path.join(projectRoot, "config", "valid.yaml");
    await mkdir(path.dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, '{"enabled":true}\n');
    await writeFile(yamlPath, "enabled: true\n");

    const result = await runQualityGate({
      projectRoot,
      files: ["config/valid.yaml", "config/valid.json", "config/valid.json"],
    });

    expect(qualityGateReportSchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({
      success: true,
      files: ["config/valid.json", "config/valid.yaml"],
    });
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "installation", status: "pass" }),
        expect.objectContaining({ id: "file-access", status: "pass" }),
        expect.objectContaining({ id: "secret-scan", status: "pass" }),
        expect.objectContaining({ id: "structured-syntax", status: "pass" }),
        expect.objectContaining({
          id: "configured-commands",
          status: "skipped",
        }),
      ]),
    );
  });

  it("reports malformed syntax and redacted secret metadata", async () => {
    const projectRoot = await createProject();
    await writeFile(
      path.join(projectRoot, "unsafe.json"),
      '{"api_key":"abcdefghijklmnop",',
    );

    const result = await runQualityGate({
      projectRoot,
      files: ["unsafe.json"],
    });

    expect(result.success).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "secret-scan",
          status: "fail",
          findings: [
            {
              ruleId: "credential-assignment",
              path: "unsafe.json",
              line: 1,
            },
          ],
        }),
        expect.objectContaining({ id: "structured-syntax", status: "fail" }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("abcdefghijklmnop");
  });

  it("rejects untracked TODO/FIXME markers without imposing comment quotas", async () => {
    const projectRoot = await createProject();
    await writeFile(
      path.join(projectRoot, "untracked.ts"),
      "export function ship(): void { /* TODO: finish this */ }\n",
    );
    await writeFile(
      path.join(projectRoot, "tracked.ts"),
      "export function repair(): void { /* FIXME(issue.repair-release): explain compatibility behavior */ }\n",
    );
    await writeFile(
      path.join(projectRoot, "plain.ts"),
      'export const selfExplanatory = "TODO is ordinary string content";\n',
    );

    const result = await runQualityGate({
      projectRoot,
      files: ["untracked.ts", "tracked.ts", "plain.ts"],
    });

    expect(result.success).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "comment-governance",
          status: "fail",
          findings: [
            {
              ruleId: "untracked-follow-up",
              path: "untracked.ts",
              line: 1,
            },
          ],
        }),
      ]),
    );
  });

  it("fails unreadable selections and rejects paths outside the project", async () => {
    const projectRoot = await createProject();

    const missing = await runQualityGate({
      projectRoot,
      files: ["missing.json"],
    });
    expect(missing.success).toBe(false);
    expect(missing.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "file-access", status: "fail" }),
        expect.objectContaining({ id: "secret-scan", status: "skipped" }),
      ]),
    );

    await expect(
      runQualityGate({ projectRoot, files: ["../outside.json"] }),
    ).rejects.toBeInstanceOf(AutoForgeError);
  });

  it("executes configured commands sequentially without hiding failures", async () => {
    const projectRoot = await createProject();
    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 0, timedOut: false })
      .mockResolvedValueOnce({ exitCode: 1, timedOut: false })
      .mockResolvedValueOnce({ exitCode: null, timedOut: true });
    const commands = [
      {
        id: "format",
        command: "npm",
        args: ["run", "format:check"],
        timeoutMs: 5_000,
      },
      { id: "test", command: "npm", args: ["test"], timeoutMs: 5_000 },
      { id: "build", command: "npm", args: ["run", "build"], timeoutMs: 5_000 },
    ];

    const result = await runQualityGate({
      projectRoot,
      commands,
      commandRunner,
    });

    expect(result.success).toBe(false);
    expect(commandRunner).toHaveBeenCalledTimes(3);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "command.format", status: "pass" }),
        expect.objectContaining({ id: "command.test", status: "fail" }),
        expect.objectContaining({
          id: "command.build",
          status: "fail",
          message: expect.stringContaining("timed out"),
        }),
      ]),
    );
  });

  it.runIf(process.platform !== "win32")(
    "terminates descendants when a quality command times out",
    async () => {
      const projectRoot = await createProject();
      const markerPath = path.join(projectRoot, "orphan-marker.txt");
      const childScript = `setTimeout(() => require("node:fs").writeFileSync(${JSON.stringify(markerPath)}, "orphaned"), 1800)`;
      const parentScript = [
        'const { spawn } = require("node:child_process");',
        `spawn(process.execPath, ["-e", ${JSON.stringify(childScript)}], { stdio: "ignore" });`,
        "setTimeout(() => {}, 10000);",
      ].join(" ");

      await expect(
        runQualityCommand(
          {
            id: "timeout-tree",
            command: process.execPath,
            args: ["-e", parentScript],
            timeoutMs: 1_000,
          },
          projectRoot,
        ),
      ).resolves.toEqual({ exitCode: null, timedOut: true });
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await expect(stat(markerPath)).rejects.toMatchObject({ code: "ENOENT" });
    },
    15_000,
  );

  it("fails closed and skips project commands for a non-current installation", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-quality-absent-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    const commandRunner = vi.fn();

    const result = await runQualityGate({
      projectRoot,
      commands: [
        { id: "test", command: "npm", args: ["test"], timeoutMs: 5_000 },
      ],
      commandRunner,
    });

    expect(result.success).toBe(false);
    expect(commandRunner).not.toHaveBeenCalled();
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "installation", status: "fail" }),
        expect.objectContaining({
          id: "configured-commands",
          status: "skipped",
        }),
      ]),
    );
  });
});
