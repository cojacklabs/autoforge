import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runOrchestrateCommand } from "../src/commands/orchestrate.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("orchestrate command", () => {
  it("plans, lists ready work, claims read-only work, and explains it", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-orchestrate-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const work = new WorkService(createWorkStateStore(projectRoot));
    const feature = await work.createFeature({
      name: "Documentation",
      description: "Maintain project documentation.",
    });
    const phase = await work.createPhase({
      featureId: feature.entity.id,
      name: "Research",
      description: "Research documentation updates.",
    });
    await work.createTask({
      phaseId: phase.entity.id,
      name: "Docs",
      description: "Research the documentation changes.",
      scope: { include: ["docs/**"], exclude: [] },
    });
    await writeFile(
      path.join(projectRoot, "orchestration-plan.json"),
      JSON.stringify({
        nodes: [
          {
            workId: "task.docs",
            objective: "Research the documentation changes.",
            acceptanceCriteria: ["Findings are recorded."],
            stage: "research",
            role: "research",
            dependencies: [],
            priority: 100,
            releaseCritical: false,
            risk: "low",
            scope: { include: ["docs/**"], exclude: [] },
            requiredCapabilities: ["contextPackets"],
          },
        ],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runOrchestrateCommand({
        args: ["plan", "orchestration-plan.json"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      runOrchestrateCommand({
        args: ["ready"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(JSON.parse(output.stdout.mock.calls[1]?.[0] ?? "[]")[0].workId).toBe(
      "task.docs",
    );
    await expect(
      runOrchestrateCommand({
        args: [
          "claim",
          "task.docs",
          "--agent",
          "antigravity",
          "--role",
          "research",
          "--read-only",
        ],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    const assignment = JSON.parse(output.stdout.mock.calls[2]?.[0] ?? "{}") as {
      id: string;
      agentId: string;
    };
    expect(assignment.agentId).toBe("gemini");
    await expect(
      runOrchestrateCommand({
        args: ["explain", "task.docs"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls[3]?.[0] ?? "{}").activeAssignment.id,
    ).toBe(assignment.id);
    expect(
      JSON.parse(output.stdout.mock.calls[3]?.[0] ?? "{}").contextFreshness,
    ).toBe("fresh");

    const workStore = createWorkStateStore(projectRoot);
    const current = await workStore.read();
    await workStore.write(
      {
        ...current.state.data,
        tasks: current.state.data.tasks.map((task) =>
          task.id === "task.docs"
            ? {
                ...task,
                description: "Research the revised documentation changes.",
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      },
      { expectedRevision: current.state.revision },
    );
    await expect(
      runOrchestrateCommand({
        args: ["explain", "task.docs"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls[4]?.[0] ?? "{}").contextFreshness,
    ).toBe("stale");
  });
});
