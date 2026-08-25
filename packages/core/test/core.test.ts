import { describe, expect, it } from "vitest";

import { ProjectIntelligenceService } from "../src/project-intelligence.js";
import {
  AgentHandoffService,
  type AgentHandoffRepository,
} from "../src/handoff.js";
import type { AgentHandoff } from "@cojacklabs/autoforge-protocol";
import {
  planFromWorkState,
  scopesOverlap,
  workScopeSchema,
} from "../src/orchestration.js";
import type {
  Clock,
  FileSystemPort,
  GitPort,
  GlobalStoragePort,
  StateRepository,
} from "../src/ports.js";

describe("model-independent AutoForge Core", () => {
  it("assesses intent deterministically with an injected clock", () => {
    const clock: Clock = { now: () => new Date("2026-08-25T00:00:00.000Z") };
    const service = new ProjectIntelligenceService(clock);
    const assessment = service.assess({
      intent: {
        raw: "Build checkout.",
        objective: "Accept card payments.",
        requirements: ["Support cards"],
        assumptions: [],
        unknowns: [],
        constraints: [],
        acceptanceCriteria: ["Payments are recorded."],
      },
      workKind: "implementation",
      artifacts: ["feature-brief"],
    });
    expect(assessment.triage.labels).toEqual(["READY_FOR_IMPLEMENTATION"]);
    expect(assessment.artifacts[0]?.generatedAt).toBe(
      "2026-08-25T00:00:00.000Z",
    );
  });

  it("projects orchestration work without filesystem or Git access", () => {
    const plan = planFromWorkState({
      tasks: [
        {
          id: "task.checkout",
          description: "Build checkout",
          status: "planned",
          scope: { include: ["src/**"], exclude: [] },
        },
      ],
      issues: [],
    });
    expect(plan.nodes[0]).toMatchObject({
      workId: "task.checkout",
      stage: "implementation",
      priority: 50,
    });
    expect(
      scopesOverlap(
        { include: ["src/**"], exclude: [] },
        { include: ["src/core/**"], exclude: [] },
      ),
    ).toBe(true);
    expect(() => workScopeSchema.parse({ include: ["../outside/**"] })).toThrow(
      "Scope patterns must be repository-relative",
    );
  });

  it("defines effects as injectable ports", () => {
    const repository: StateRepository<{ ready: boolean }> = {
      read: async () => ({ revision: 1, data: { ready: true } }),
      write: async (data) => ({ revision: 2, data }),
    };
    const filesystem: FileSystemPort = {
      readText: async () => "",
      writeText: async () => undefined,
      ensureDirectory: async () => undefined,
    };
    const git: GitPort = {
      provisionWorktree: async () => ({ branch: "test", path: "/tmp/test" }),
    };
    const globalStorage: GlobalStoragePort = {
      read: async () => null,
      write: async () => undefined,
    };
    expect(repository).toBeDefined();
    expect(filesystem).toBeDefined();
    expect(git).toBeDefined();
    expect(globalStorage).toBeDefined();
  });

  it("creates and persists handoffs through an injected repository", async () => {
    const handoffs = new Map<string, AgentHandoff>();
    const repository: AgentHandoffRepository = {
      write: async (handoff) => {
        handoffs.set(handoff.id, handoff);
        return `.autoforge/handoffs/${handoff.id}.json`;
      },
      read: async (id) => handoffs.get(id) ?? null,
      list: async () => [...handoffs.values()],
    };
    const service = new AgentHandoffService(repository, {
      clock: { now: () => new Date("2026-08-25T00:00:00.000Z") },
    });
    const result = await service.create({
      id: "handoff.claude-to-codex",
      project: { id: "project.autoforge", name: "autoforge" },
      session: { id: "session.claude", fromAgent: "claude", toAgent: "codex" },
      activeWork: {
        kind: "task",
        id: "task.structured-handoff",
        name: "Structured handoff",
        objective: "Transfer project truth.",
      },
      scope: { include: ["packages/**"], exclude: [] },
      git: { head: "abc123" },
      changedFiles: [],
      decisions: [],
      validation: [],
      risks: [],
      openQuestions: [],
      nextAction: "Continue in Codex.",
      contextFingerprint: "a".repeat(64),
    });
    expect(result.location).toBe(
      ".autoforge/handoffs/handoff.claude-to-codex.json",
    );
    await expect(service.read(result.handoff.id)).resolves.toEqual(
      result.handoff,
    );
  });
});
