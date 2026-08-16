import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OrchestratorKernel } from "../scripts/orchestrator_kernel.js";
import { RunStore } from "../scripts/run_store.js";

test("OrchestratorKernel - dryRun and startRun lifecycle", async (t) => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "autoforge-kernel-test-"),
  );
  const dbPath = path.join(tempDir, "test-autoforge.db");
  const store = new RunStore(dbPath);

  // Set up mock recipe directory
  const recipeDir = path.join(tempDir, "docs", "blueprint", "recipes");
  fs.mkdirSync(recipeDir, { recursive: true });
  fs.writeFileSync(
    path.join(recipeDir, "test_recipe.yaml"),
    `name: test_recipe
stages:
  - id: intake
    role: product_manager
    approvals: ["human"]
    deliverables: ["docs/prd.md"]
  - id: engineering
    role: fullstack_engineer
    deliverables: ["src/index.js"]
`,
  );

  const kernel = new OrchestratorKernel({
    projectRoot: tempDir,
    runStore: store,
  });

  await t.test("should perform dryRun on a recipe", async () => {
    const report = await kernel.dryRun("test_recipe");
    assert.equal(report.recipeName, "test_recipe");
    assert.equal(report.executionPlan.length, 2);
    assert.equal(report.executionPlan[0].id, "intake");
    assert.equal(report.executionPlan[0].approvals[0], "human");
  });

  await t.test(
    "should start run, persist WorkItem & Run, and fetch status",
    () => {
      const { workItemId, runId } = kernel.startRun({
        title: "Add OAuth2 Auth Flow",
        objective: "Google and GitHub single sign-on",
        riskTier: "R2",
        autonomyLevel: 1,
        recipeName: "test_recipe",
        owner: "user:colton",
      });

      assert.ok(workItemId.startsWith("WI-"));
      assert.ok(runId.startsWith("RUN-"));

      const status = kernel.getStatus(runId);
      assert.ok(status);
      assert.equal(status.run.id, runId);
      assert.equal(status.workItem.title, "Add OAuth2 Auth Flow");
      assert.equal(status.workItem.riskTier, "R2");
      assert.equal(status.workItem.state, "ready_for_planning");
    },
  );

  // Teardown
  store.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
