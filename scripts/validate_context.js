#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { globSync } from "glob";
import yaml from "yaml";

const targetArg = process.argv[2];
const rootDir = targetArg
  ? path.resolve(process.cwd(), targetArg)
  : process.cwd();
const manifestPath = path.join(rootDir, "ai/context.manifest.yaml");
const targetsPath = path.join(rootDir, "ai/context_targets.yaml");

if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

console.log(`Validating context against ${manifestPath}`);
console.log(
  "(Run this script from the AutoForge directory or pass a path to it).",
);

const DEFAULT_FILES = {
  blueprint_master: "docs/blueprint/AGENTIC_BLUEPRINT.md",
  blueprint_spec: "docs/blueprint/spec.md",
  blueprint_tech: "docs/blueprint/tech.md",
  blueprint_vision: "docs/blueprint/vision.md",
  prd: "docs/prd/PRODUCT_REQUIREMENTS.md",
  uiux_style_guide: "docs/uiux/style_guide.md",
  uiux_wireframes: "docs/uiux/wireframes.md",
  uiux_user_flows: "docs/uiux/user_flows.md",
  uiux_accessibility: "docs/uiux/accessibility_guidelines.md",
  research_policy: "research/SOURCES_POLICY.md",
  security_readiness: "security/SECURITY_READINESS.md",
  qa_matrix: "qa/tests.md",
  devops_config: "devops/devops.yaml",
  devops_runbook: "devops/runbooks/deploy.md",
  api_contract: "api/openapi.yaml",
};

const DEFAULT_GLOBS = {
  diagrams: "diagrams/*.mmd",
  change_requests: "change_requests/*.yaml",
  ideas: "ideas/*.yaml",
  tests: "ai/reports/tests_stub.md",
  ci_config: "ai/reports/ci_stub.md",
  learning_feedback: "ai/reports/learning/*.md",
};

let overrides = {};
if (existsSync(targetsPath)) {
  try {
    const parsed = yaml.parse(readFileSync(targetsPath, "utf-8"));
    overrides = parsed?.context_targets ?? {};
  } catch (err) {
    console.warn(`⚠️ Unable to parse ${targetsPath}:`, err.message);
  }
}

const requiredFiles = { ...DEFAULT_FILES, ...(overrides.required_files ?? {}) };
const requiredGlobs = { ...DEFAULT_GLOBS, ...(overrides.required_globs ?? {}) };

const missing = [];

for (const [label, relPath] of Object.entries(requiredFiles)) {
  if (!relPath) continue;
  const full = path.join(rootDir, relPath);
  if (!existsSync(full)) {
    missing.push(`${label}: ${relPath}`);
  }
}

for (const [label, pattern] of Object.entries(requiredGlobs)) {
  if (!pattern) continue;
  const matches = globSync(pattern, { cwd: rootDir, nodir: true });
  if (matches.length === 0) {
    missing.push(`${label}: ${pattern}`);
  }
}

if (missing.length > 0) {
  console.error("❌ Missing required context files:");
  for (const item of missing) {
    console.error(`  - ${item}`);
  }
  process.exit(1);
}

console.log("✅ Context validated successfully.");
