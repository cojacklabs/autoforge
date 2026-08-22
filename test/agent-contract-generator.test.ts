import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  AgentContractStore,
  generateAgentContract,
} from "../src/contract/generator.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("agent contract generator", () => {
  it("generates and persists a project contract", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-contract-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    const contract = generateAgentContract({
      agentId: "generic",
      projectRoot,
      workflowKind: "feature-development",
      workflowStage: "planning",
      validationCommands: ["npm test"],
    });
    const store = new AgentContractStore(projectRoot);
    await expect(store.write(contract)).resolves.toBe(
      ".autoforge/agent-contract.json",
    );
    await expect(store.read()).resolves.toEqual(contract);
  });

  it.each(["antigravity", "agy"])("normalizes %s to gemini", (agentId) => {
    const contract = generateAgentContract({
      agentId,
      projectRoot: "/tmp/project",
      validationCommands: ["npm test"],
    });
    expect(contract.agentId).toBe("gemini");
    expect(contract.contextCommand).toBe(
      'autoforge --project "$PWD" context --explain',
    );
  });
});
