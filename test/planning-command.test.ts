import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runPlanningCommand } from "../src/commands/planning.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { generatePlanningArtifact } from "../src/planning/artifacts.js";
import { PlanningArtifactStore } from "../src/planning/store.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const directories: string[] = [];
const intent = {
  raw: "Build checkout.",
  objective: "Allow payment.",
  requirements: ["Support cards"],
  assumptions: [],
  unknowns: [],
  constraints: [],
  acceptanceCriteria: ["Payment succeeds."],
};

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("planning command", () => {
  it("rejects unknown artifact kinds and malformed flags", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runPlanningCommand({
        args: ["show", "unknown"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    await expect(
      runPlanningCommand({
        args: ["list", "--unexpected"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists artifacts and reports freshness", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    await new PlanningArtifactStore(projectRoot).write(
      generatePlanningArtifact(intent, "feature-brief"),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runPlanningCommand({
        args: ["list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "[]")).toHaveLength(
      1,
    );
    await expect(
      runPlanningCommand({
        args: ["show", "feature-brief"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(JSON.parse(output.stdout.mock.calls[1]?.[0] ?? "{}").kind).toBe(
      "feature-brief",
    );
  });

  it("reports a fresh artifact against its source intent", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-freshness-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    await writeFile(
      path.join(projectRoot, "intent.json"),
      `${JSON.stringify(intent)}\n`,
    );
    await new PlanningArtifactStore(projectRoot).write(
      generatePlanningArtifact(intent, "feature-brief"),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPlanningCommand({
        args: ["list", "--source", "intent.json"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "[]")).toEqual([
      expect.objectContaining({ kind: "feature-brief", fresh: true }),
    ]);
  });

  it("hands a planning artifact off to a scoped task", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-handoff-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const service = new WorkService(createWorkStateStore(projectRoot));
    const feature = await service.createFeature({
      name: "Checkout",
      description: "Payments",
    });
    const phase = await service.createPhase({
      featureId: feature.entity.id,
      name: "Build",
      description: "Implement",
    });
    await new PlanningArtifactStore(projectRoot).write(
      generatePlanningArtifact(intent, "feature-brief"),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPlanningCommand({
        args: [
          "handoff",
          "feature-brief",
          "--phase",
          phase.entity.id,
          "--include",
          "src/checkout/**",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("Created task task.feature-brief-implementation"),
    );
  });

  it("rejects missing artifacts and invalid phases", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-planning-handoff-errors-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runPlanningCommand({
        args: [
          "handoff",
          "feature-brief",
          "--phase",
          "phase.missing",
          "--include",
          "src/**",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
