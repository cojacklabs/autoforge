import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { WorkflowStateStore } from "../src/workflows/state.js";

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
    });
  });
});
