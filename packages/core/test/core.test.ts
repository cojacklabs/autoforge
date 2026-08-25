import { describe, expect, it } from "vitest";

import { ProjectIntelligenceService } from "../src/project-intelligence.js";
import { planFromWorkState, scopesOverlap } from "../src/orchestration.js";
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
});
