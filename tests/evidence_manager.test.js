import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EvidenceManager } from "../scripts/evidence_manager.js";

test("EvidenceManager - audit evidence recording and matrix generation", async (t) => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "autoforge-evidence-test-"),
  );
  const manager = new EvidenceManager({ projectRoot: tempDir });

  await t.test("should record gate evidence", () => {
    const filePath = manager.recordGateEvidence("RUN-101", {
      gateType: "secret_scan",
      passed: true,
      findings: [],
    });
    assert.ok(fs.existsSync(filePath));
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    assert.equal(content.gateType, "secret_scan");
    assert.equal(content.passed, true);
  });

  await t.test("should generate traceability matrix", () => {
    const matrixFile = manager.generateTraceabilityMatrix({ runId: "RUN-101" });
    assert.ok(fs.existsSync(matrixFile));
    const matrix = JSON.parse(fs.readFileSync(matrixFile, "utf8"));
    assert.equal(matrix.standard, "SOC 2 Type II / ISO 27001 Secure SDLC");
    assert.equal(matrix.phases["1_planning"].status, "verified");
  });

  // Teardown
  fs.rmSync(tempDir, { recursive: true, force: true });
});
