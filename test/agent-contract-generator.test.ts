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
    expect(contract.requiredActions).toContain(
      "Document non-obvious intent, public contracts, invariants, security or compatibility constraints, and unusual tradeoffs with concise explain-why comments.",
    );
    expect(contract.prohibitedActions).toContain(
      "Add comments that restate syntax, preserve prompt transcripts, become stale narratives, or leave TODO/FIXME markers without an AutoForge task or issue reference.",
    );
    expect(contract.completionRequirements).toContain(
      "Review changed code for required high-value commentary and work-linked TODO/FIXME markers.",
    );
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

  it("repairs a stale project root after the project directory moves", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-contract-"));
    directories.push(root);
    const previousRoot = path.join(root, "before");
    const currentRoot = path.join(root, "after");
    await mkdir(path.join(currentRoot, ".autoforge"), { recursive: true });
    const store = new AgentContractStore(currentRoot);
    await store.write(
      generateAgentContract({
        agentId: "generic",
        projectRoot: previousRoot,
        validationCommands: ["npm test"],
      }),
    );
    await expect(store.repairProjectRoot()).resolves.toBe("updated");
    await expect(store.read()).resolves.toMatchObject({
      projectRoot: currentRoot,
    });
    await expect(store.repairProjectRoot()).resolves.toBe("current");
  });

  it("treats an absent optional contract as missing during repair", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-contract-"),
    );
    directories.push(projectRoot);
    await expect(
      new AgentContractStore(projectRoot).repairProjectRoot(),
    ).resolves.toBe("missing");
  });
});
