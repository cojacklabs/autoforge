import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RunStore } from "../scripts/run_store.js";

test("RunStore - database initialization and CRUD operations", async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoforge-test-"));
  const dbPath = path.join(tempDir, "test-autoforge.db");
  const store = new RunStore(dbPath);

  await t.test("should create and retrieve a WorkItem", () => {
    store.createWorkItem({
      id: "WI-2026-001",
      title: "Integrate Stripe Checkout",
      objective: "Add subscription payment flow",
      riskTier: "R2",
      state: "draft",
      owner: "user:colton",
      acceptanceCriteria: [
        "Support monthly plan",
        "Webhook signature verification",
      ],
      linkedArtifacts: ["docs/prd/PRODUCT_REQUIREMENTS.md"],
    });

    const item = store.getWorkItem("WI-2026-001");
    assert.ok(item);
    assert.equal(item.id, "WI-2026-001");
    assert.equal(item.riskTier, "R2");
    assert.equal(item.state, "draft");
    assert.equal(item.acceptanceCriteria.length, 2);

    store.updateWorkItemState("WI-2026-001", "ready_for_planning");
    const updated = store.getWorkItem("WI-2026-001");
    assert.equal(updated.state, "ready_for_planning");
  });

  await t.test("should create, update and query Run state", () => {
    store.createRun({
      id: "RUN-001",
      workItemId: "WI-2026-001",
      recipeName: "web_app",
      autonomyLevel: 1,
    });

    const run = store.getRun("RUN-001");
    assert.ok(run);
    assert.equal(run.status, "pending");
    assert.equal(run.autonomyLevel, 1);

    store.updateRunStatus("RUN-001", "running");
    assert.equal(store.getRun("RUN-001").status, "running");

    store.updateRunStatus("RUN-001", "completed");
    const completed = store.getRun("RUN-001");
    assert.equal(completed.status, "completed");
    assert.ok(completed.completedAt);
  });

  await t.test("should handle Approvals workflow", () => {
    store.createApproval({
      id: "APP-001",
      runId: "RUN-001",
      decisionClass: "database_migration",
      scope: "Apply 20260816_add_users_table.sql",
      requestedBy: "agent:architect",
    });

    const pending = store.getPendingApprovals("RUN-001");
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, "APP-001");
    assert.equal(pending[0].status, "pending");

    store.resolveApproval(
      "APP-001",
      "user:colton",
      "approved",
      "Looks safe, indexes are present",
    );
    const pendingAfter = store.getPendingApprovals("RUN-001");
    assert.equal(pendingAfter.length, 0);
  });

  // Teardown
  store.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
