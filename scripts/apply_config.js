#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "yaml";

const CODE_TARGETS_HEADER = `# AutoForge code-target configuration (managed).
# Edit autoforge.config.json instead of modifying this file directly.
# Paths are relative to the AutoForge directory unless noted otherwise.
`;

const CONTEXT_TARGETS_HEADER = `# AutoForge context target overrides (managed).
# Edit autoforge.config.json instead of modifying this file directly.
# Paths are relative to the AutoForge directory unless noted otherwise.
`;

function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, "autoforge.config.json");
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function normaliseTargetEntry(value, fallback = {}) {
  if (typeof value === "string") {
    return { path: value, description: fallback.description };
  }
  if (value && typeof value === "object") {
    return {
      path: value.path ?? fallback.path ?? "",
      description: value.description ?? fallback.description,
    };
  }
  return { path: fallback.path ?? "", description: fallback.description };
}

function writeCodeTargets(autoforgeDir, codeTargetsConfig = {}) {
  const defaults = {
    backend: {
      path: "../src/backend",
      description:
        "Default backend location; update via autoforge.config.json.",
    },
    frontend: {
      path: "../src/frontend",
      description:
        "Default frontend/UI location; update via autoforge.config.json.",
    },
    tests: {
      path: "../tests",
      description: "Default tests directory; update via autoforge.config.json.",
    },
  };

  const doc = {
    code_targets: {},
    notes: [
      "- The agents consult these paths when generating application code or tests.",
      "- Update autoforge.config.json and rerun `npx autoforge configure` to change them.",
      "- Keep planning artifacts inside the AutoForge directory.",
    ].join("\n"),
  };

  const entries = { ...defaults, ...codeTargetsConfig };
  const extra = Array.isArray(entries.extra) ? entries.extra : [];
  delete entries.extra;

  for (const [key, value] of Object.entries(entries)) {
    const fallback = defaults[key] ?? {
      description: "Configured via autoforge.config.json.",
    };
    const normalised = normaliseTargetEntry(value, fallback);
    doc.code_targets[key] = {
      path: normalised.path ?? fallback.path ?? "",
      description:
        normalised.description ??
        fallback.description ??
        "Configured via autoforge.config.json.",
    };
  }

  doc.code_targets.extra = extra;

  const yamlContent = yaml.stringify(doc, {
    lineWidth: 0,
    sortMapEntries: false,
  });
  writeFileSync(
    path.join(autoforgeDir, "ai/code_targets.yaml"),
    `${CODE_TARGETS_HEADER}\n${yamlContent}`,
  );
}

function writeContextTargets(autoforgeDir, contextConfig = {}) {
  const defaults = {
    requiredFiles: {
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
    },
    requiredGlobs: {
      diagrams: "diagrams/*.mmd",
      change_requests: "change_requests/*.yaml",
      ideas: "ideas/*.yaml",
    },
    optionalDirectories: {
      research_plans: ["research/plans"],
      research_briefs: ["research/briefs"],
      uiux_assets: ["docs/uiux"],
    },
  };

  const contextTargets = {
    required_files: {
      ...defaults.requiredFiles,
      ...(contextConfig.requiredFiles ?? {}),
    },
    required_globs: {
      ...defaults.requiredGlobs,
      ...(contextConfig.requiredGlobs ?? {}),
    },
    optional_directories: {
      ...defaults.optionalDirectories,
      ...(contextConfig.optionalDirectories ?? {}),
    },
  };

  const doc = { context_targets: contextTargets };
  const yamlContent = yaml.stringify(doc, {
    lineWidth: 0,
    sortMapEntries: false,
  });
  writeFileSync(
    path.join(autoforgeDir, "ai/context_targets.yaml"),
    `${CONTEXT_TARGETS_HEADER}\n${yamlContent}`,
  );
}

function main() {
  const [, , projectRootArg] = process.argv;
  const projectRoot = projectRootArg
    ? path.resolve(projectRootArg)
    : process.cwd();
  const hiddenDir = path.join(projectRoot, ".autoforge");
  const legacyDir = path.join(projectRoot, "autoforge");
  const autoforgeDir = existsSync(hiddenDir) ? hiddenDir : legacyDir;

  if (!existsSync(autoforgeDir)) {
    throw new Error(
      `.autoforge/ directory not found at ${hiddenDir}. Run this command from your project root.`,
    );
  }

  const config = loadConfig(projectRoot);
  mkdirSync(path.join(autoforgeDir, "ai"), { recursive: true });
  writeCodeTargets(autoforgeDir, config.codeTargets);
  writeContextTargets(autoforgeDir, config.contextTargets);
  console.log("✔ Applied AutoForge configuration");
}

try {
  main();
} catch (err) {
  console.error(`Failed to apply configuration: ${err.message}`);
  process.exitCode = 1;
}
