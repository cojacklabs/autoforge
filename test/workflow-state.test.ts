import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { WorkflowStateStore } from "../src/workflows/state.js";
import { createWorkflowHandoff } from "../src/workflows/handoff.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("workflow state", () => {
  it("persists and advances ordered workflow stages", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-state-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    const store = new WorkflowStateStore(projectRoot);
    await expect(
      store.create(
        "feature.checkout",
        "feature-development",
        new Date("2026-08-20T00:00:00.000Z"),
      ),
    ).resolves.toMatchObject({ currentStage: "research" });
    await expect(
      store.advance("feature.checkout", new Date("2026-08-20T01:00:00.000Z")),
    ).resolves.toMatchObject({
      currentStage: "planning",
      completedStages: ["research"],
      status: "active",
    });
  });

  it("skips optional stages when requested", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-skip-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    const store = new WorkflowStateStore(projectRoot);
    await store.create("feature.skip", "feature-development");
    await expect(
      store.advance("feature.skip", new Date(), true),
    ).resolves.toMatchObject({
      currentStage: "planning",
      completedStages: ["research"],
    });
  });

  it("marks the final stage complete and rejects further advancement", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-complete-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    const store = new WorkflowStateStore(projectRoot);
    await store.create("validation.run", "validation");
    await expect(store.advance("validation.run")).resolves.toMatchObject({
      status: "completed",
    });
    await expect(store.advance("validation.run")).rejects.toThrow(
      "already complete",
    );
  });

  it("persists and reads stage handoffs", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-workflow-handoff-store-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    const store = new WorkflowStateStore(projectRoot);
    const handoff = createWorkflowHandoff({
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
    });
    await expect(store.writeHandoff(handoff)).resolves.toContain("handoffs/");
    await expect(
      store.readHandoff("feature.checkout", "research", "planning"),
    ).resolves.toEqual(handoff);
  });
});
