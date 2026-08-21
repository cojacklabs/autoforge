import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ContextPacketCompiler } from "../src/context/packet.js";
import { contextSelectionSchema } from "../src/context/schemas.js";
import { WorkflowStateStore } from "../src/workflows/state.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("workflow context integration", () => {
  it("carries an automatic handoff into a stage-aware packet", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-integration-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    const store = new WorkflowStateStore(projectRoot);
    await store.create("feature.checkout", "feature-development");
    const run = await store.advance("feature.checkout");
    const handoffId = "feature.checkout-research-to-planning";
    await expect(
      store.readHandoff("feature.checkout", "research", "planning"),
    ).resolves.toMatchObject({ workflowId: "feature.checkout" });
    const selection = contextSelectionSchema.parse({
      work: {
        kind: "issue",
        item: {
          id: "issue.workflow",
          name: "Workflow integration",
          description: "Verify stage handoff context.",
          status: "active",
          scope: { include: ["src/**"], exclude: [] },
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
        startedAt: "2026-08-20T00:00:00.000Z",
        objective: "Verify stage handoff context.",
        reasons: ["workflow"],
        estimatedTokens: 10,
      },
      doctrines: [],
      decisions: [],
      specs: [],
      exclusions: [],
      budget: {
        maxTokens: 100,
        usedTokens: 10,
        remainingTokens: 90,
        exceeded: false,
      },
      workflow: {
        kind: run.kind,
        currentStage: run.currentStage,
        status: run.status,
        handoffIds: [handoffId],
      },
    });
    expect(new ContextPacketCompiler().compile(selection).content).toContain(
      handoffId,
    );
  });
});
