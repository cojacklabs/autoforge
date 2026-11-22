#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import yaml from "yaml";

const CODE_TARGETS_HEADER = `# Priozar code-target configuration (managed).
# Edit priozar.config.json instead of modifying this file directly.
# Paths are relative to the Priozar directory unless noted otherwise.
`;

const CONTEXT_TARGETS_HEADER = `# Priozar context target overrides (managed).
# Edit priozar.config.json instead of modifying this file directly.
# Paths are relative to the Priozar directory unless noted otherwise.
`;

// priozar.config.json is canonical; autoforge.config.json is still read so
// projects that have not renamed it keep working.
const CONFIG_FILE_NAMES = ["priozar.config.json", "autoforge.config.json"];

function loadConfig(projectRoot) {
  const configPath = CONFIG_FILE_NAMES.map((name) =>
    path.join(projectRoot, name),
  ).find((candidate) => existsSync(candidate));
  if (!configPath) {
    throw new Error(
      `Configuration file not found: ${path.join(projectRoot, CONFIG_FILE_NAMES[0])} (or legacy ${CONFIG_FILE_NAMES[1]})`,
    );
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
      description: "Default backend location; update via priozar.config.json.",
    },
    frontend: {
      path: "../src/frontend",
      description:
        "Default frontend/UI location; update via priozar.config.json.",
    },
    tests: {
      path: "../tests",
      description: "Default tests directory; update via priozar.config.json.",
    },
  };

  const doc = {
    code_targets: {},
    notes: [
      "- The agents consult these paths when generating application code or tests.",
      "- Update priozar.config.json and rerun `npx priozar configure` to change them.",
      "- Keep planning artifacts inside the Priozar directory.",
    ].join("\n"),
  };

  const entries = { ...defaults, ...codeTargetsConfig };
  const extra = Array.isArray(entries.extra) ? entries.extra : [];
  delete entries.extra;

  for (const [key, value] of Object.entries(entries)) {
    const fallback = defaults[key] ?? {
      description: "Configured via priozar.config.json.",
    };
    const normalised = normaliseTargetEntry(value, fallback);
    doc.code_targets[key] = {
      path: normalised.path ?? fallback.path ?? "",
      description:
        normalised.description ??
        fallback.description ??
        "Configured via priozar.config.json.",
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
  const stateDirs = [".priozar", ".autoforge", "autoforge"].map((name) =>
    path.join(projectRoot, name),
  );
  const autoforgeDir = stateDirs.find((candidate) => existsSync(candidate));

  if (!autoforgeDir) {
    throw new Error(
      `.priozar/ (or legacy .autoforge/) directory not found in ${projectRoot}. Run this command from your project root.`,
    );
  }

  const config = loadConfig(projectRoot);
  mkdirSync(path.join(autoforgeDir, "ai"), { recursive: true });
  writeCodeTargets(autoforgeDir, config.codeTargets);
  writeContextTargets(autoforgeDir, config.contextTargets);
  console.log("✔ Applied Priozar configuration");
}

try {
  main();
} catch (err) {
  console.error(`Failed to apply configuration: ${err.message}`);
  process.exitCode = 1;
}
