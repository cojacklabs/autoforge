import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ResearchEngine } from "../scripts/research_engine.js";

test("ResearchEngine - risk scan and readiness artifact generation", async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autoforge-research-test-"));

  // Mock a package.json with Stripe and OAuth dependencies
  fs.writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({
      name: "test-app",
      dependencies: {
        stripe: "^14.0.0",
        "@auth/core": "^0.18.0",
      },
    })
  );

  const engine = new ResearchEngine({ projectRoot: tempDir });

  await t.test("should identify elevated risk triggers from dependencies and goals", async () => {
    const report = await engine.scan("Build SaaS subscription checkout with AI recommendations");
    assert.equal(report.riskTier, "R2");
    assert.ok(report.findings.length >= 2);

    const domains = report.findings.map((f) => f.domain);
    assert.ok(domains.includes("financial_integrity"));
    assert.ok(domains.includes("privacy_and_identity"));
    assert.ok(domains.includes("ai_risk_management"));
  });

  await t.test("should scaffold readiness artifacts into docs/", async () => {
    const report = await engine.scan("Integrate Stripe checkout");
    engine.scaffoldReadinessArtifacts(report);

    assert.ok(fs.existsSync(path.join(tempDir, "docs", "security", "APPLICATION_RISK_PROFILE.md")));
    assert.ok(fs.existsSync(path.join(tempDir, "docs", "privacy", "DATA_INVENTORY.yaml")));
    assert.ok(fs.existsSync(path.join(tempDir, "docs", "security", "THREAT_MODEL.md")));
    assert.ok(fs.existsSync(path.join(tempDir, "docs", "uiux", "ACCESSIBILITY_PLAN.md")));
  });

  // Teardown
  fs.rmSync(tempDir, { recursive: true, force: true });
});
