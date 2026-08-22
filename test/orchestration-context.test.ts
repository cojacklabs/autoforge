import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { ConstitutionStore } from "../src/governance/store.js";
import { ProjectOrchestrationContextProvider } from "../src/orchestration/context.js";
import type { OrchestrationNode } from "../src/orchestration/schemas.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("orchestration assignment context", () => {
  it("keeps canonical context identical across agents while applying governance and gates", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-orchestration-context-"),
    );
    roots.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const work = new WorkService(createWorkStateStore(projectRoot));
    const feature = await work.createFeature({
      name: "Accounts",
      description: "Manage customer accounts.",
    });
    const phase = await work.createPhase({
      featureId: feature.entity.id,
      name: "Security",
      description: "Secure account access.",
    });
    await work.createTask({
      phaseId: phase.entity.id,
      name: "Harden Authentication",
      description: "Harden authentication boundaries.",
      scope: { include: ["src/auth/**"], exclude: [] },
    });
    await new ConstitutionStore(projectRoot).save({
      id: "constitution.project.security",
      name: "Security Constitution",
      purpose: "Protect authentication changes.",
      source: "human-approved",
      updatedAt: "2026-08-22T12:00:00.000Z",
      rules: [
        {
          id: "constitution.security.review",
          title: "Security review",
          statement: "Authentication changes MUST receive security review.",
          level: "MUST",
          enforcement: "hard",
          scope: {
            paths: ["src/auth/**"],
            workKinds: ["implementation"],
            releases: [],
            tags: [],
          },
          rationale: "Authentication is security-sensitive.",
          nonGoals: [],
        },
      ],
    });
    const configPath = path.join(projectRoot, ".autoforge", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          ...config,
          qualityGates: [
            {
              id: "focused-tests",
              command: "npm",
              args: ["test", "--", "auth"],
              timeoutMs: 120_000,
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const timestamp = "2026-08-22T12:00:00.000Z";
    const node: OrchestrationNode = {
      workId: "task.harden-authentication",
      objective: "Harden authentication boundaries.",
      acceptanceCriteria: ["Authentication tests pass."],
      stage: "implementation",
      role: "security",
      dependencies: [],
      priority: 80,
      releaseCritical: false,
      risk: "normal",
      scope: { include: ["src/auth/**"], exclude: [] },
      requiredCapabilities: ["contextPackets"],
      status: "ready",
      blockedReasons: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const provider = new ProjectOrchestrationContextProvider(projectRoot);
    const base = {
      node,
      role: "security" as const,
      contextBudget: 12_000,
      createdAt: timestamp,
    };
    const codex = await provider.compile({ ...base, agentId: "codex" });
    const claude = await provider.compile({ ...base, agentId: "claude" });

    expect(codex.context).toEqual(claude.context);
    expect(codex.context.content).toContain("constitution.security.review");
    expect(codex.requiredActions).toContainEqual(
      expect.stringContaining("constitution.security.review"),
    );
    expect(codex.validationCommands).toEqual(["npm test -- auth"]);
  });
});
