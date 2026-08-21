import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runWorkflowCommand } from "../src/commands/workflow.js";
import {
  AgentContractStore,
  generateAgentContract,
} from "../src/contract/generator.js";
import { EXIT_CODE } from "../src/core/errors.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("workflow command", () => {
  it("starts, shows, and advances a workflow", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    await new AgentContractStore(projectRoot).write(
      generateAgentContract({
        agentId: "generic",
        projectRoot,
        validationCommands: ["npm test"],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runWorkflowCommand({
        args: ["start", "feature.checkout", "feature-development"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "{}").currentStage,
    ).toBe("research");
    await expect(
      runWorkflowCommand({
        args: ["advance", "feature.checkout"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      runWorkflowCommand({
        args: ["show", "feature.checkout"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls[2]?.[0] ?? "{}").currentStage,
    ).toBe("planning");
  });

  it("imports a handoff artifact", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-handoff-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    await new AgentContractStore(projectRoot).write(
      generateAgentContract({
        agentId: "generic",
        projectRoot,
        validationCommands: ["npm test"],
      }),
    );
    await writeFile(
      path.join(projectRoot, "handoff.json"),
      JSON.stringify({
        workflowId: "feature.checkout",
        workflowKind: "feature-development",
        fromStage: "research",
        toStage: "planning",
        objective: "Plan checkout.",
        completedWork: ["Research complete."],
        decisions: [],
        openQuestions: [],
        validation: ["Sources recorded."],
        sourceArtifacts: ["research.payment-provider"],
        createdAt: "2026-08-20T00:00:00.000Z",
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runWorkflowCommand({
        args: ["handoff", "handoff.json"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("research → planning"),
    );
  });

  it("lists persisted workflow runs", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-list-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    await new AgentContractStore(projectRoot).write(
      generateAgentContract({
        agentId: "generic",
        projectRoot,
        validationCommands: ["npm test"],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runWorkflowCommand({
      args: ["start", "feature.z", "feature-development"],
      output,
      startDirectory: projectRoot,
    });
    await runWorkflowCommand({
      args: ["start", "feature.a", "feature-development"],
      output,
      startDirectory: projectRoot,
    });
    await expect(
      runWorkflowCommand({
        args: ["list"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls[2]?.[0] ?? "[]").map(
        (run: { id: string }) => run.id,
      ),
    ).toEqual(["feature.a", "feature.z"]);
  });

  it("rejects workflow starts without a valid contract", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-contract-required-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runWorkflowCommand({
        args: ["start", "feature.missing-contract", "feature-development"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
