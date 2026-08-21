import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { runBootstrapCommand } from "../src/commands/bootstrap.js";
import { scaffoldBootstrapManifest } from "../src/bootstrap/inspect.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("bootstrap command", () => {
  it("prints a readiness report", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-command-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["inspect"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"nextAction": "initialize"'),
    );
  });

  it("prints the scaffolded bootstrap manifest status", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-status-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await scaffoldBootstrapManifest(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["status"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"artifacts"'),
    );
  });

  it("records approved discovery input without overwriting it", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-discovery-"),
    );
    directories.push(project);
    const source = path.join(project, "discovery.json");
    await writeFile(
      source,
      JSON.stringify({
        approved: true,
        vision: "A focused project",
        problem: "Manual setup is slow",
        users: ["builders"],
        useCases: ["bootstrap a repository"],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["discover", source],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      readFile(
        path.join(project, ".autoforge", "bootstrap", "discovery.json"),
        "utf8",
      ),
    ).resolves.toContain('"approved": true');
  });

  it("reports pending acceptance gates", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-gates-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await scaffoldBootstrapManifest(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({ args: ["gates"], output, startDirectory: project }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"ready": false'),
    );
  });
});
