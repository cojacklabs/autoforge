import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatDoctrine,
  formatDoctrineList,
  runDoctrineCommand,
} from "../src/commands/doctrine.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createInitialDoctrineRegistry } from "../src/doctrine/builtins.js";

const TIMESTAMP = "2026-08-20T10:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-doctrine-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({
    projectRoot,
    now: () => new Date(TIMESTAMP),
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

describe("doctrine command formatting", () => {
  it("renders compact registry and detailed doctrine views", () => {
    const registry = createInitialDoctrineRegistry(TIMESTAMP);

    expect(formatDoctrineList(registry)).toContain("AutoForge doctrines: 11");
    expect(formatDoctrineList(registry)).toContain(
      "testing [active, builtin] — Verify observable behavior",
    );
    expect(formatDoctrine(registry.doctrines[5]!)).toContain(
      "Path patterns: test/**, tests/**, **/*.test.*, **/*.spec.*",
    );
  });
});

describe("doctrine command", () => {
  it("lists doctrines from persisted project state", async () => {
    const projectRoot = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoctrineCommand({ args: [], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "AutoForge doctrines: 11",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "router [active, builtin]",
    );
  });

  it("shows one doctrine by name or stable ID", async () => {
    const projectRoot = await createFixture();

    for (const identifier of ["security", "doctrine.security"]) {
      const output = { stdout: vi.fn(), stderr: vi.fn() };
      await expect(
        runDoctrineCommand({
          args: [identifier],
          output,
          startDirectory: projectRoot,
        }),
      ).resolves.toBe(EXIT_CODE.success);
      expect(output.stdout.mock.calls[0]?.[0]).toContain(
        "doctrine.security — Security",
      );
      expect(output.stdout.mock.calls[0]?.[0]).toContain("# Security");
    }
  });

  it("rejects unknown doctrines and extra arguments", async () => {
    const projectRoot = await createFixture();
    const unknown = { stdout: vi.fn(), stderr: vi.fn() };
    const extra = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoctrineCommand({
        args: ["missing"],
        output: unknown,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(unknown.stderr).toHaveBeenCalledWith("Unknown doctrine: missing");

    await expect(
      runDoctrineCommand({
        args: ["testing", "extra"],
        output: extra,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(extra.stderr).toHaveBeenCalledWith(
      "Usage: autoforge doctrine [name]",
    );
  });
});
