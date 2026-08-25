import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadProjectStatus,
  runStatusCommand,
} from "../apps/core-cli/src/status.js";
import { initializeProject } from "../src/commands/init.js";
import { runStartCommand } from "../src/commands/start.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-status-"));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, ".git"));
  await initializeProject({ projectRoot: directory });
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("project status command", () => {
  it("prints concise idle status with a relevant start command", async () => {
    const projectRoot = await createProject();
    const planning = new WorkService(createWorkStateStore(projectRoot));
    const { entity: feature } = await planning.createFeature({
      name: "Status",
      description: "Status feature",
    });
    const { entity: phase } = await planning.createPhase({
      featureId: feature.id,
      name: "CLI",
      description: "CLI phase",
    });
    const { entity: task } = await planning.createTask({
      phaseId: phase.id,
      name: "Next task",
      description: "Implement next task",
      scope: { include: ["src/**"], exclude: [] },
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runStatusCommand({ args: [], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining(`autoforge start task ${task.id}`),
    );
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("autoforge help"),
    );
  });

  it("returns a protocol-versioned JSON envelope", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await runStatusCommand({
      args: ["--json"],
      output,
      startDirectory: projectRoot,
    });
    const parsed = JSON.parse(output.stdout.mock.calls[0]?.[0] as string);
    expect(parsed.protocolVersion).toBe("1");
    expect(parsed.data.project.root).toBe(projectRoot);
    expect(parsed.data.work.state).toBe("idle");
  });

  it("provides bounded work and next views", async () => {
    const projectRoot = await createProject();
    for (const view of ["work", "next"] as const) {
      const output = { stdout: vi.fn(), stderr: vi.fn() };
      await expect(
        runStatusCommand({
          args: ["--view", view],
          output,
          startDirectory: projectRoot,
        }),
      ).resolves.toBe(EXIT_CODE.success);
      expect(output.stdout.mock.calls[0]?.[0].split("\n").length).toBeLessThan(
        10,
      );
    }
  });

  it("reports active work and lifecycle next commands", async () => {
    const projectRoot = await createProject();
    const planning = new WorkService(createWorkStateStore(projectRoot));
    const { entity: feature } = await planning.createFeature({
      name: "Status",
      description: "Status feature",
    });
    const { entity: phase } = await planning.createPhase({
      featureId: feature.id,
      name: "CLI",
      description: "CLI phase",
    });
    const { entity: task } = await planning.createTask({
      phaseId: phase.id,
      name: "Active task",
      description: "Implement active status",
      scope: { include: ["src/**"], exclude: [] },
    });
    await runStartCommand({
      args: ["task", task.id],
      output: { stdout: vi.fn(), stderr: vi.fn() },
      startDirectory: projectRoot,
      now: () => new Date("2026-08-25T00:00:00.000Z"),
      sessionId: () => "session.status-test",
    });

    const status = await loadProjectStatus(
      projectRoot,
      () => new Date("2026-08-25T00:01:00.000Z"),
    );
    expect(status.work.active).toMatchObject({
      id: task.id,
      sessionId: "session.status-test",
    });
    expect(status.nextCommands).toContain("autoforge done");
  });

  it("rejects unknown or duplicated options", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runStatusCommand({
        args: ["--view", "everything"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("Usage:"),
    );
  });
});
