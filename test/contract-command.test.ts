import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runContractCommand } from "../src/commands/contract.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("contract command", () => {
  it("generates, shows, and validates an agent contract", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-contract-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runContractCommand({
        args: ["generate", "generic"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      runContractCommand({
        args: ["show"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[1]?.[0]).toContain('"agentId": "generic"');
    await expect(
      runContractCommand({
        args: ["validate"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("derives validationCommands from configured quality gates instead of hardcoding npm", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-contract-gates-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });

    const configPath = path.join(projectRoot, ".autoforge", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.qualityGates = [
      { id: "test", command: "pnpm", args: ["test"], timeoutMs: 120_000 },
      {
        id: "typecheck",
        command: "pnpm",
        args: ["typecheck"],
        timeoutMs: 120_000,
      },
    ];
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runContractCommand({
        args: ["generate", "generic"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      runContractCommand({
        args: ["show"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const shown = output.stdout.mock.calls[1]?.[0] as string;
    expect(shown).toContain("pnpm test");
    expect(shown).toContain("pnpm typecheck");
    expect(shown).not.toMatch(/(?<!p)npm test/);
  });

  it("falls back to npm test when no quality gates are configured", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-contract-no-gates-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runContractCommand({
        args: ["generate", "generic"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      runContractCommand({
        args: ["show"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[1]?.[0]).toContain("npm test");
  });

  it("rejects unsupported agent identities", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-contract-unsupported-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runContractCommand({
        args: ["generate", "unknown"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.notFound);
    expect(output.stderr.mock.calls[0]?.[0]).toContain(
      "Agent unknown cannot satisfy",
    );
  });

  it.each(["antigravity", "agy"])(
    "generates aliases for %s",
    async (agentId) => {
      const projectRoot = await mkdtemp(
        path.join(os.tmpdir(), "autoforge-contract-alias-"),
      );
      directories.push(projectRoot);
      await mkdir(path.join(projectRoot, ".git"));
      await initializeProject({ projectRoot });
      const output = { stdout: vi.fn(), stderr: vi.fn() };
      await expect(
        runContractCommand({
          args: ["generate", agentId],
          output,
          startDirectory: projectRoot,
        }),
      ).resolves.toBe(EXIT_CODE.success);
    },
  );
});
