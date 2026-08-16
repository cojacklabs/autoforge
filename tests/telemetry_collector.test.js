import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TelemetryCollector } from "../scripts/telemetry_collector.js";

test("TelemetryCollector - event logging, metrics computation, and suggestions", async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoforge-telemetry-test-"));
  const telemetryPath = path.join(tempDir, "telemetry.jsonl");

  const collector = new TelemetryCollector({ projectRoot: tempDir, customPath: telemetryPath });

  await t.test("should record events to JSONL file", () => {
    collector.record({
      runId: "RUN-001",
      type: "gate_evaluation",
      role: "fullstack_engineer",
      gateType: "tsc",
      passed: false,
      errorContext: "Property 'id' does not exist on type 'User'",
    });

    collector.record({
      runId: "RUN-001",
      type: "gate_evaluation",
      role: "fullstack_engineer",
      gateType: "tsc",
      passed: true,
    });

    collector.record({
      runId: "RUN-001",
      type: "agent_complete",
      role: "fullstack_engineer",
      retries: 1,
      tokens: { promptTokens: 1200, completionTokens: 400 },
    });

    collector.record({
      runId: "RUN-001",
      type: "approval_resolved",
      approver: "user:colton",
    });

    const allEvents = collector.readAll();
    assert.equal(allEvents.length, 4);
    assert.equal(allEvents[0].type, "gate_evaluation");
    assert.equal(allEvents[0].passed, false);
  });

  await t.test("should accurately aggregate metrics", () => {
    const metrics = collector.computeMetrics();
    assert.equal(metrics.totalRuns, 1);
    assert.equal(metrics.totalGates, 2);
    assert.equal(metrics.passedGates, 1);
    assert.equal(metrics.failedGates, 1);
    assert.equal(metrics.firstPassGateRate, 50.0);
    assert.equal(metrics.totalRetries, 1);
    assert.equal(metrics.totalTokens, 1600);
    assert.equal(metrics.humanApprovals, 1);
    assert.equal(metrics.gateFailureTypes.tsc, 1);
  });

  await t.test("should generate prompt improvement suggestions when recurring failures are detected", () => {
    // Record another tsc failure
    collector.record({
      runId: "RUN-002",
      type: "gate_evaluation",
      role: "fullstack_engineer",
      gateType: "tsc",
      passed: false,
    });

    const suggestions = collector.generateSuggestions(5);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].targetRole, "fullstack_engineer");
    assert.equal(suggestions[0].gateType, "tsc");
    assert.equal(suggestions[0].failureCount, 2);
    assert.ok(suggestions[0].recommendation.includes("tsc"));
  });

  // Teardown
  fs.rmSync(tempDir, { recursive: true, force: true });
});
