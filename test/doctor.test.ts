import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDoctor, runDoctorCommand } from "../src/commands/doctor.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";

const PROJECT_ID = "f45b8e3d-e9d8-465b-8489-3bc5e5e5a4dd";
const TIMESTAMP = "2026-08-19T23:30:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-doctor-"));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, ".git"));
  return directory;
}

async function initializeFixture(projectRoot: string): Promise<void> {
  await initializeProject({
    projectRoot,
    projectId: PROJECT_ID,
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "doctor-test",
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("foundation doctor", () => {
  it("reports a healthy initialized project", async () => {
    const projectRoot = await createProject();
    await initializeFixture(projectRoot);

    await expect(
      runDoctor({ startDirectory: projectRoot, nodeVersion: "22.19.0" }),
    ).resolves.toMatchObject({
      healthy: true,
      projectRoot,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: "node-version", status: "pass" }),
        expect.objectContaining({ id: "global-registry", status: "warning" }),
        expect.objectContaining({ id: "project-root", status: "pass" }),
        expect.objectContaining({ id: "filesystem-access", status: "pass" }),
        expect.objectContaining({ id: "installation", status: "pass" }),
        expect.objectContaining({ id: "config-schema", status: "pass" }),
        expect.objectContaining({ id: "metadata-schema", status: "pass" }),
        expect.objectContaining({ id: "work-schema", status: "pass" }),
        expect.objectContaining({ id: "session-schema", status: "pass" }),
        expect.objectContaining({ id: "decision-schema", status: "pass" }),
        expect.objectContaining({ id: "doctrine-schema", status: "pass" }),
        expect.objectContaining({
          id: "doctrine-session-schema",
          status: "pass",
        }),
        expect.objectContaining({ id: "project-identity", status: "pass" }),
      ]),
    });
  });

  it("reports a registered global workspace", async () => {
    const projectRoot = await createProject();
    await initializeFixture(projectRoot);
    const homeDirectory = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-doctor-home-"),
    );
    temporaryDirectories.push(homeDirectory);
    await mkdir(path.join(homeDirectory, ".autoforge"), { recursive: true });
    await writeFile(
      path.join(homeDirectory, ".autoforge", "config.json"),
      JSON.stringify({ version: "0.11.0", projects: [projectRoot] }),
    );

    await expect(
      runDoctor({ startDirectory: projectRoot, homeDirectory }),
    ).resolves.toMatchObject({
      checks: expect.arrayContaining([
        expect.objectContaining({ id: "global-registry", status: "pass" }),
      ]),
    });
  });

  it("reports an absent installation", async () => {
    const projectRoot = await createProject();

    const result = await runDoctor({ startDirectory: projectRoot });

    expect(result.healthy).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "installation", status: "fail" }),
    );
  });

  it("reports a legacy installation without changing it", async () => {
    const projectRoot = await createProject();
    const legacyFile = path.join(projectRoot, ".autoforge", "ai", "README.md");
    await mkdir(path.dirname(legacyFile), { recursive: true });
    await writeFile(legacyFile, "legacy\n");

    const result = await runDoctor({ startDirectory: projectRoot });

    expect(result.healthy).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        id: "installation",
        status: "fail",
        message: expect.stringContaining("legacy"),
      }),
    );
  });

  it("reports malformed foundation state", async () => {
    const projectRoot = await createProject();
    await initializeFixture(projectRoot);
    await writeFile(
      path.join(projectRoot, ".autoforge", "config.json"),
      "{broken",
    );

    const result = await runDoctor({ startDirectory: projectRoot });

    expect(result.healthy).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ id: "installation-schema", status: "fail" }),
    );
  });

  it("reports missing or malformed kernel state", async () => {
    const projectRoot = await createProject();
    await initializeFixture(projectRoot);
    await rm(path.join(projectRoot, ".autoforge", "state", "work.json"));

    const missing = await runDoctor({ startDirectory: projectRoot });
    expect(missing.healthy).toBe(false);
    expect(missing.checks).toContainEqual(
      expect.objectContaining({ id: "installation", status: "fail" }),
    );

    const malformedRoot = await createProject();
    await initializeFixture(malformedRoot);
    await writeFile(
      path.join(malformedRoot, ".autoforge", "state", "session.json"),
      "{broken",
    );
    const malformed = await runDoctor({ startDirectory: malformedRoot });
    expect(malformed.healthy).toBe(false);
    expect(malformed.checks).toContainEqual(
      expect.objectContaining({ id: "installation-schema", status: "fail" }),
    );
  });

  it("reports missing or malformed decision state", async () => {
    const missingRoot = await createProject();
    await initializeFixture(missingRoot);
    await rm(path.join(missingRoot, ".autoforge", "state", "decisions.json"));

    const missing = await runDoctor({ startDirectory: missingRoot });
    expect(missing.healthy).toBe(false);
    expect(missing.checks).toContainEqual(
      expect.objectContaining({ id: "installation", status: "fail" }),
    );

    const malformedRoot = await createProject();
    await initializeFixture(malformedRoot);
    await writeFile(
      path.join(malformedRoot, ".autoforge", "state", "decisions.json"),
      JSON.stringify({
        schemaVersion: 1,
        revision: 0,
        updatedAt: TIMESTAMP,
        data: { decisions: [{ id: "decision.incomplete" }] },
      }),
    );

    const malformed = await runDoctor({ startDirectory: malformedRoot });
    expect(malformed.healthy).toBe(false);
    expect(malformed.checks).toContainEqual(
      expect.objectContaining({ id: "installation-schema", status: "fail" }),
    );
  });

  it("reports unsupported Node and failed filesystem access", async () => {
    const projectRoot = await createProject();
    const checkAccess = vi.fn(async () => {
      throw new Error("denied");
    });

    const result = await runDoctor({
      startDirectory: projectRoot,
      nodeVersion: "18.20.0",
      checkAccess,
    });

    expect(result.healthy).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "node-version", status: "fail" }),
        expect.objectContaining({ id: "filesystem-access", status: "fail" }),
      ]),
    );
  });

  it("reports a missing project root instead of throwing", async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-no-project-"),
    );
    temporaryDirectories.push(directory);

    const result = await runDoctor({ startDirectory: directory });

    expect(result.healthy).toBe(false);
    expect(result.checks.at(-1)).toMatchObject({
      id: "project-root",
      status: "fail",
    });
  });
});

describe("doctor command", () => {
  it("formats checks and returns the health exit code", async () => {
    const projectRoot = await createProject();
    await initializeFixture(projectRoot);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoctorCommand({
        args: [],
        output,
        startDirectory: projectRoot,
        nodeVersion: "22.19.0",
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("[PASS]"),
    );
    expect(output.stderr).not.toHaveBeenCalled();
  });

  it("rejects command arguments", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoctorCommand({
        args: ["extra"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
