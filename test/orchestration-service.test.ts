import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  OrchestrationService,
  scopesOverlap,
} from "../src/orchestration/service.js";
import type { WorktreeManager } from "../src/orchestration/worktrees.js";
import type { OrchestrationPlanInput } from "../src/orchestration/schemas.js";
import type { OrchestrationContextProvider } from "../src/orchestration/context.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function ids(): () => string {
  let value = 0;
  return () => `test-${++value}`;
}

const fakeWorktrees: WorktreeManager = {
  async provision(_projectRoot, workId, assignmentId) {
    return {
      branch: `autoforge/${workId}/${assignmentId}`,
      path: `/tmp/${assignmentId}`,
    };
  },
};

const fakeContextProvider: OrchestrationContextProvider = {
  async compile({ node, contextBudget }) {
    return {
      context: {
        content: `# Assignment Context\n\n${node.objective}`,
        estimatedTokens: 10,
        sourceFingerprint: "a".repeat(64),
        sources: [
          {
            kind: "work",
            id: node.workId,
            reasons: [`active-work: ${node.workId}`],
            estimatedTokens: 10,
          },
        ],
        exclusions: [],
      },
      requiredActions: ["Read assignment context."],
      prohibitedActions: ["Do not leave assignment scope."],
      validationCommands: ["npm test"],
      completionRequirements: ["Attach validation evidence."],
    };
  },
};

function node(
  workId: string,
  include: string,
  overrides: Partial<OrchestrationPlanInput["nodes"][number]> = {},
): OrchestrationPlanInput["nodes"][number] {
  return {
    workId,
    objective: `Complete ${workId}.`,
    acceptanceCriteria: [`${workId} is validated.`],
    stage: "implementation",
    role: "general",
    dependencies: [],
    priority: 50,
    releaseCritical: false,
    risk: "normal",
    scope: { include: [include], exclude: [] },
    requiredCapabilities: ["contextPackets", "contractValidation"],
    ...overrides,
  };
}

async function project(): Promise<string> {
  const directory = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "autoforge-orchestration-")),
  );
  directories.push(directory);
  return directory;
}

describe("multi-agent orchestration", () => {
  it("detects conservative scope overlap", () => {
    expect(
      scopesOverlap(
        { include: ["src/**"], exclude: [] },
        { include: ["src/api/**"], exclude: [] },
      ),
    ).toBe(true);
    expect(
      scopesOverlap(
        { include: ["src/frontend/**"], exclude: [] },
        { include: ["src/backend/**"], exclude: [] },
      ),
    ).toBe(false);
  });

  it("ranks ready work and unblocks downstream work after handoff", async () => {
    const projectRoot = await project();
    const service = new OrchestrationService(projectRoot, {
      id: ids(),
      worktrees: fakeWorktrees,
      contextProvider: fakeContextProvider,
    });
    await service.plan({
      nodes: [
        node("task.plan", "docs/**", { priority: 60 }),
        node("task.build", "src/**", {
          dependencies: ["task.plan"],
          releaseCritical: true,
        }),
        node("task.docs", "README.md", { priority: 100 }),
      ],
    });

    expect((await service.ready()).map((item) => item.workId)).toEqual([
      "task.docs",
      "task.plan",
    ]);
    await service.prioritize("task.plan", 100);
    expect((await service.ready()).map((item) => item.workId)).toEqual([
      "task.plan",
      "task.docs",
    ]);
    const assignment = await service.claim({
      workId: "task.plan",
      agentId: "codex",
      mode: "read",
    });
    const completed = await service.handoff(assignment.id, {
      completedWork: ["Planning completed."],
      decisions: [],
      openQuestions: [],
      validation: [],
      sourceArtifacts: ["plan.md"],
    });
    expect(
      completed.nodes.find((item) => item.workId === "task.build")?.status,
    ).toBe("blocked");
    expect(
      completed.nodes.find((item) => item.workId === "task.build")
        ?.blockedReasons,
    ).toContain("Approval gate gate.task.build.release is pending");
  });

  it("requires risk gates and explains readiness after approval", async () => {
    const projectRoot = await project();
    const service = new OrchestrationService(projectRoot, {
      id: ids(),
      worktrees: fakeWorktrees,
      contextProvider: fakeContextProvider,
    });
    await service.plan({
      nodes: [node("task.security", "src/auth/**", { role: "security" })],
    });
    expect(await service.ready()).toHaveLength(0);
    await service.approve("gate.task.security.security", "owner@example.com");
    const explanation = await service.explain("task.security");
    expect(explanation).toMatchObject({ eligible: true, rank: 1 });
  });

  it("rejects overlapping writers while allowing read-only sessions", async () => {
    const projectRoot = await project();
    const service = new OrchestrationService(projectRoot, {
      id: ids(),
      worktrees: fakeWorktrees,
      contextProvider: fakeContextProvider,
    });
    await service.plan({
      nodes: [
        node("task.frontend", "src/**"),
        node("task.api", "src/api/**"),
        node("task.research", "src/api/**", {
          stage: "research",
          role: "research",
        }),
      ],
    });
    const writer = await service.claim({
      workId: "task.frontend",
      agentId: "claude",
    });
    expect(writer.worktree).toContain(writer.id);
    await expect(
      service.claim({ workId: "task.api", agentId: "codex" }),
    ).rejects.toThrow("write lease already overlaps");
    await expect(
      service.claim({
        workId: "task.research",
        agentId: "agy",
        role: "research",
        mode: "read",
      }),
    ).resolves.toMatchObject({ agentId: "gemini", mode: "read" });
    const packet = JSON.parse(
      await readFile(
        path.join(
          projectRoot,
          ".autoforge",
          "orchestration",
          "packets",
          `${writer.id}.json`,
        ),
        "utf8",
      ),
    ) as { allowedFiles: { include: string[] } };
    expect(packet.allowedFiles.include).toEqual(["src/**"]);
  });

  it("expires abandoned leases and returns work to the ready queue", async () => {
    const projectRoot = await project();
    let now = new Date("2026-08-22T12:00:00.000Z");
    const service = new OrchestrationService(projectRoot, {
      id: ids(),
      now: () => now,
      worktrees: fakeWorktrees,
      contextProvider: fakeContextProvider,
    });
    await service.plan({ nodes: [node("task.expiring", "src/**")] });
    const assignment = await service.claim({
      workId: "task.expiring",
      agentId: "grok",
      ttlMinutes: 1,
    });
    now = new Date("2026-08-22T12:02:00.000Z");
    const state = await service.status();
    expect(
      state.assignments.find((item) => item.id === assignment.id)?.status,
    ).toBe("expired");
    expect(state.nodes[0]?.status).toBe("ready");
    expect(
      state.events.filter((event) => event.type === "lease-expired"),
    ).toHaveLength(1);
  });
});
