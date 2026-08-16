#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import { OrchestratorKernel } from "../scripts/orchestrator_kernel.js";
import { RunStore } from "../scripts/run_store.js";
import { ResearchEngine } from "../scripts/research_engine.js";
import { TelemetryCollector } from "../scripts/telemetry_collector.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const distRoot = path.join(packageRoot, "dist");
const CONFIG_FILE = "autoforge.config.json";
const DEFAULT_DIRNAME = ".autoforge";
const LEGACY_DIRNAME = "autoforge";
const USER_PRESERVE_PATHS = [
  "ai/logs",
  "ai/reports",
  "ai/memory",
  "change_requests",
  "ideas",
  "research",
  "scripts/custom",
  "docs/custom",
];

const color = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
};

function printUsage() {
  console.log(`AutoForge CLI

Usage:
  autoforge init [--force]
  autoforge load
  autoforge autopilot [--dry-run] [--level <0-3>] [--task "<objective>"] [--recipe <name>]
  autoforge research scan [--task "<objective>"] [--generate]
  autoforge readiness check
  autoforge train [--from-last-N <N>] [--apply]
  autoforge metrics
  autoforge status [run-id]
  autoforge approve <approval-id> [--reject] [--note "<note>"]
  autoforge doctor
  autoforge snapshot [targetDir]
  autoforge configure
  autoforge version
  autoforge refresh
  autoforge help
`);
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src, dest, filter) {
  await cp(src, dest, {
    recursive: true,
    filter,
  });
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${command} ${args.join(" ")} exited with code ${code}`),
        );
      }
    });
  });
}

async function ensureConfig(projectRoot) {
  const targetConfig = path.join(projectRoot, CONFIG_FILE);
  if (await pathExists(targetConfig)) {
    return;
  }
  const templatePath = path.join(distRoot, CONFIG_FILE);
  let contents = "{}";
  try {
    contents = await readFile(templatePath, "utf8");
  } catch {
    console.warn(
      color.yellow(
        `Warning: default config template missing at ${templatePath}, writing empty config.`,
      ),
    );
  }
  await writeFile(targetConfig, contents, "utf8");
  console.log(color.green(`✔ Created ${CONFIG_FILE}`));
}

async function ensureRepomixConfig(projectRoot) {
  const targetConfig = path.join(projectRoot, "repomix.config.json");
  const templatePath = path.join(distRoot, "repomix.config.json");
  try {
    const contents = await readFile(templatePath, "utf8");
    await writeFile(targetConfig, contents, "utf8");
    console.log(color.green(`✔ Created repomix.config.json`));
  } catch {
    console.warn(
      color.yellow(
        `Warning: repomix.config.json template missing at ${templatePath}. Skipping repomix config setup.`,
      ),
    );
  }
}

function resolveAutoforgeDir(projectRoot, { forInit = false } = {}) {
  if (forInit) return path.join(projectRoot, DEFAULT_DIRNAME);
  const hidden = path.join(projectRoot, DEFAULT_DIRNAME);
  const legacy = path.join(projectRoot, LEGACY_DIRNAME);
  return pathExists(hidden).then((h) => (h ? hidden : legacy));
}

async function prepareAutoforgeFolder(projectRoot, { force = false } = {}) {
  const targetDir = path.join(projectRoot, DEFAULT_DIRNAME);
  const exists = await pathExists(targetDir);
  if (exists && !force) {
    throw new Error(
      `${DEFAULT_DIRNAME}/ already exists. Re-run with --force to overwrite.`,
    );
  }
  if (exists && force) {
    console.log(
      color.yellow(`⚠ Removing existing ${DEFAULT_DIRNAME}/ (force mode)`),
    );
    await rm(targetDir, { recursive: true, force: true });
  }
  await mkdir(targetDir, { recursive: true });
  return targetDir;
}

async function copyFramework(targetDir) {
  console.log(color.blue(`→ Copying framework files into ${targetDir}`));
  await copyDir(distRoot, targetDir, (src) => {
    const relative = path.relative(distRoot, src);
    if (!relative) {
      return true;
    }
    const parts = relative.split(path.sep);
    if (
      parts[0] === "bin" ||
      parts[0] === CONFIG_FILE ||
      parts[0] === "repomix.config.json"
    ) {
      return false;
    }
    return true;
  });
  // Remove template artifacts if they slipped through
  const copiedConfig = path.join(targetDir, CONFIG_FILE);
  if (await pathExists(copiedConfig)) {
    await rm(copiedConfig, { force: true });
  }
}

async function applyConfiguration(projectRoot) {
  const scriptPath = path.join(packageRoot, "scripts", "apply_config.js");
  await runCommand(process.execPath, [scriptPath, projectRoot]);
}

async function commandInit(args) {
  const force = args.includes("--force");
  const projectRoot = process.cwd();
  const targetDir = await prepareAutoforgeFolder(projectRoot, { force });
  await copyFramework(targetDir);
  await ensureConfig(projectRoot);
  await ensureRepomixConfig(projectRoot);
  await applyConfiguration(projectRoot);
  console.log(color.green("✔ AutoForge initialized"));
}

async function backupUserData(autoforgeDir) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-upgrade-"));
  const backups = [];
  for (const relative of USER_PRESERVE_PATHS) {
    const fullPath = path.join(autoforgeDir, relative);
    if (await pathExists(fullPath)) {
      const backupPath = path.join(tempRoot, relative.replace(/[\\/]/g, "_"));
      await rm(backupPath, { recursive: true, force: true });
      await copyDir(fullPath, backupPath);
      backups.push({ relative, backupPath });
    }
  }
  return { tempRoot, backups };
}

async function restoreUserData(autoforgeDir, backupBundle) {
  const { tempRoot, backups } = backupBundle;
  for (const { relative, backupPath } of backups) {
    const destPath = path.join(autoforgeDir, relative);
    await rm(destPath, { recursive: true, force: true });
    await mkdir(path.dirname(destPath), { recursive: true });
    await copyDir(backupPath, destPath);
  }
  await rm(tempRoot, { recursive: true, force: true });
}

async function commandUpgrade() {
  const projectRoot = process.cwd();
  const autoforgeDir = await resolveAutoforgeDir(projectRoot);
  if (!(await pathExists(autoforgeDir))) {
    console.log(
      color.yellow(
        `No ${DEFAULT_DIRNAME}/ directory found. Running init instead.`,
      ),
    );
    await commandInit([]);
    return;
  }

  const backupBundle = await backupUserData(autoforgeDir);
  console.log(color.blue("→ Replacing framework files"));
  await rm(autoforgeDir, { recursive: true, force: true });
  await mkdir(autoforgeDir, { recursive: true });
  await copyFramework(autoforgeDir);
  await restoreUserData(autoforgeDir, backupBundle);
  await ensureRepomixConfig(projectRoot);
  await applyConfiguration(projectRoot);
  console.log(color.green("✔ AutoForge upgraded"));
}

async function commandValidate() {
  const projectRoot = process.cwd();
  const autoforgeDir = await resolveAutoforgeDir(projectRoot);
  if (!(await pathExists(autoforgeDir))) {
    throw new Error(
      `${DEFAULT_DIRNAME}/ directory not found. Run \`autoforge init\` first.`,
    );
  }
  console.log(color.blue("→ Running validation"));
  const scriptPath = path.join(packageRoot, "scripts", "validate_context.js");
  await runCommand(process.execPath, [scriptPath, autoforgeDir]);
}

async function commandConfigure(args) {
  const projectRoot = process.cwd();
  if (args.length && args[0] !== "--force") {
    console.warn(
      color.yellow("configure command ignores additional arguments."),
    );
  }
  await applyConfiguration(projectRoot);
}

async function commandSnapshot(args) {
  const scriptPath = path.join(packageRoot, "scripts", "generate_snapshot.js");
  await runCommand(process.execPath, [scriptPath, ...args]);
}

function findRecipes(projectRoot) {
  const recipesDir = path.join(projectRoot, "docs", "blueprint", "recipes");
  const patterns = [
    path.join(recipesDir, "*.yaml"),
    path.join(recipesDir, "*.yml"),
  ];
  const files = patterns.flatMap((p) => globSync(p, { nodir: true }));
  return files;
}

function loadRecipeByName(projectRoot, name) {
  const files = findRecipes(projectRoot);
  if (name) {
    for (const f of files) {
      if (path.basename(f).replace(/\.(ya?ml)$/i, "") === name) {
        const doc = yaml.parse(readFileSync(f, "utf8"));
        return { file: f, recipe: doc };
      }
    }
  }
  // Prefer web_app if available, else first available
  let candidate = files.find((f) => /web_app\.ya?ml$/i.test(f)) || files[0];
  if (!candidate) return null;
  const doc = yaml.parse(readFileSync(candidate, "utf8"));
  return { file: candidate, recipe: doc };
}

async function commandAutopilot(args) {
  const projectRoot = process.cwd();
  const kernel = new OrchestratorKernel({ projectRoot });

  const isDryRun = args.includes("--dry-run");
  const levelIdx = args.findIndex((a) => a === "--level");
  const autonomyLevel = levelIdx >= 0 ? parseInt(args[levelIdx + 1], 10) : 1;

  const taskIdx = args.findIndex((a) => a === "--task");
  const task = taskIdx >= 0 ? args[taskIdx + 1] : "";

  const recipeIdx = args.findIndex((a) => a === "--recipe");
  const recipeName = recipeIdx >= 0 ? args[recipeIdx + 1] : "web_app";

  if (isDryRun || !task) {
    try {
      const report = await kernel.dryRun(recipeName);
      console.log(color.blue(`→ Dry run for recipe: ${report.recipeName}`));
      console.log(color.yellow("(No code will be generated or modified.)\n"));

      console.log(color.blue("Preflight Checks:"));
      for (const check of report.preflight) {
        const statusText =
          check.status === "passed"
            ? color.green("PASSED")
            : color.red("MISSING");
        console.log(`- ${check.label}: ${statusText}`);
      }
      console.log("");

      console.log(color.blue("Execution Plan:"));
      for (const stage of report.executionPlan) {
        const approvals = stage.approvals.length
          ? ` (requires: ${stage.approvals.join(", ")})`
          : "";
        console.log(`${stage.step}. ${stage.id} — Role: ${stage.role}${approvals}`);
        if (stage.deliverables.length) {
          console.log(`   Deliverables: ${stage.deliverables.join(", ")}`);
        }
      }
      console.log("");

      if (report.ciTemplates.length) {
        console.log(color.blue("Suggested CI Templates:"));
        for (const t of report.ciTemplates) {
          console.log(`- ${t}`);
        }
        console.log("");
      }

      if (!task && !isDryRun) {
        console.log(
          color.yellow(
            `Tip: Pass --task "<objective>" to initialize a real orchestrated run.`,
          ),
        );
      }
    } catch (err) {
      console.error(color.red(`Dry run error: ${err.message}`));
      process.exitCode = 1;
    }
    return;
  }

  // Real Run Initialization
  try {
    const { workItemId, runId } = kernel.startRun({
      title: task,
      objective: task,
      riskTier: "R1",
      autonomyLevel,
      recipeName,
      owner: "developer",
    });

    console.log(color.green(`✔ Initialized AutoForge Run [${runId}]`));
    console.log(color.blue(`  WorkItem ID : ${workItemId}`));
    console.log(color.blue(`  Objective   : ${task}`));
    console.log(color.blue(`  Autonomy    : Level ${autonomyLevel}`));
    console.log(color.blue(`  Recipe      : ${recipeName}`));
    console.log(
      `\nTo view execution status, run:\n  ${color.green(`npx autoforge status ${runId}`)}\n`,
    );
  } catch (err) {
    console.error(color.red(`Failed to start run: ${err.message}`));
    process.exitCode = 1;
  }
}

async function commandStatus(args) {
  const projectRoot = process.cwd();
  const runId = args[0];
  const kernel = new OrchestratorKernel({ projectRoot });

  if (!runId) {
    console.log(color.yellow("Usage: autoforge status <run-id>"));
    return;
  }

  const status = kernel.getStatus(runId);
  if (!status) {
    console.log(color.red(`Run not found: ${runId}`));
    process.exitCode = 1;
    return;
  }

  const { run, workItem, pendingApprovals } = status;
  console.log(color.blue(`=== AutoForge Run Status: ${run.id} ===`));
  console.log(`Status        : ${color.green(run.status)}`);
  console.log(`Autonomy Level: Level ${run.autonomyLevel}`);
  console.log(`Recipe        : ${run.recipeName}`);
  console.log(`Started At    : ${run.startedAt}`);

  if (workItem) {
    console.log(color.blue(`\n=== Linked WorkItem: ${workItem.id} ===`));
    console.log(`Title         : ${workItem.title}`);
    console.log(`Risk Tier     : ${workItem.riskTier}`);
    console.log(`State         : ${workItem.state}`);
  }

  if (pendingApprovals && pendingApprovals.length > 0) {
    console.log(color.yellow(`\n⚠ Pending Approvals (${pendingApprovals.length}):`));
    for (const app of pendingApprovals) {
      console.log(`- [${app.id}] Class: ${app.decisionClass} | Scope: ${app.scope}`);
      console.log(`  To approve: ${color.green(`npx autoforge approve ${app.id}`)}`);
    }
  } else {
    console.log(color.green("\n✔ No pending human approvals required."));
  }
}

async function commandApprove(args) {
  const projectRoot = process.cwd();
  const approvalId = args[0];
  if (!approvalId) {
    console.log(color.yellow("Usage: autoforge approve <approval-id> [--reject] [--note \"<note>\"]"));
    return;
  }

  const isReject = args.includes("--reject");
  const noteIdx = args.findIndex((a) => a === "--note");
  const note = noteIdx >= 0 ? args[noteIdx + 1] : "";

  const kernel = new OrchestratorKernel({ projectRoot });
  try {
    kernel.resolveApproval(
      approvalId,
      isReject ? "rejected" : "approved",
      "developer",
      note,
    );
    console.log(
      color.green(
        `✔ Approval [${approvalId}] successfully marked as ${isReject ? "REJECTED" : "APPROVED"}`,
      ),
    );
  } catch (err) {
    console.error(color.red(`Failed to resolve approval: ${err.message}`));
    process.exitCode = 1;
  }
}

async function commandResearch(args) {
  const projectRoot = process.cwd();
  const taskIdx = args.findIndex((a) => a === "--task");
  const task = taskIdx >= 0 ? args[taskIdx + 1] : "";
  const shouldGenerate = args.includes("--generate");

  const engine = new ResearchEngine({ projectRoot });
  console.log(color.blue("→ Running Advanced Research & Risk Discovery Scan..."));

  const scanResult = await engine.scan(task);
  console.log(color.blue(`\n=== Application Risk Assessment ===`));
  console.log(`Risk Tier: ${scanResult.riskTier === "R2" ? color.yellow("R2 (Elevated Risk)") : color.green("R1 (Standard)")}`);
  console.log(`Objective: ${scanResult.goal || "Standard Application Baseline"}\n`);

  if (scanResult.findings.length > 0) {
    console.log(color.yellow("Findings & Required Controls:"));
    for (const f of scanResult.findings) {
      console.log(`- [${f.domain.toUpperCase()}] ${f.message}`);
      console.log(`  Assigned Reviewer: ${f.reviewer}`);
      for (const c of f.controlsRequired) {
        console.log(`  • ${c}`);
      }
    }
  } else {
    console.log(color.green("✔ No elevated risk domains detected."));
  }

  if (scanResult.dataInventory.detectedCategories.length > 0) {
    console.log(color.blue("\nDetected Data Categories:"));
    for (const cat of scanResult.dataInventory.detectedCategories) {
      console.log(`- ${cat.field} [${cat.classification}]`);
    }
  }

  if (shouldGenerate) {
    engine.scaffoldReadinessArtifacts(scanResult);
    console.log(color.green("\n✔ Generated readiness artifacts:"));
    console.log("  - docs/security/APPLICATION_RISK_PROFILE.md");
    console.log("  - docs/privacy/DATA_INVENTORY.yaml");
    console.log("  - docs/security/THREAT_MODEL.md");
    console.log("  - docs/uiux/ACCESSIBILITY_PLAN.md");
  } else {
    console.log(
      color.yellow(
        `\nTip: Re-run with ${color.green("autoforge research scan --generate")} to scaffold these readiness artifacts into docs/`,
      ),
    );
  }
}

async function commandReadiness() {
  const projectRoot = process.cwd();
  const engine = new ResearchEngine({ projectRoot });
  const scanResult = await engine.scan();

  console.log(color.blue("=== AutoForge Pre-Release Readiness Check ==="));
  if (scanResult.missingArtifacts.length > 0) {
    console.log(color.yellow(`⚠ Missing Readiness Artifacts (${scanResult.missingArtifacts.length}):`));
    for (const missing of scanResult.missingArtifacts) {
      console.log(`- ${missing}`);
    }
    console.log(
      `\nRun ${color.green("npx autoforge research scan --generate")} to scaffold the missing planning artifacts.`,
    );
  } else {
    console.log(color.green("✔ All core readiness artifacts are present and tracked."));
  }
}

async function commandMetrics() {
  const projectRoot = process.cwd();
  const telemetry = new TelemetryCollector({ projectRoot });
  const metrics = telemetry.computeMetrics();

  console.log(color.blue("=== AutoForge Telemetry & Quality Metrics ==="));
  console.log(`Total Runs Tracked      : ${color.green(metrics.totalRuns)}`);
  console.log(`Lifecycle Events Logged : ${metrics.totalEvents}`);
  console.log(`Total Quality Gates     : ${metrics.totalGates} (${color.green(`${metrics.passedGates} passed`)}, ${color.red(`${metrics.failedGates} failed`)})`);
  console.log(`First-Pass Gate Rate    : ${metrics.firstPassGateRate >= 80 ? color.green(`${metrics.firstPassGateRate}%`) : color.yellow(`${metrics.firstPassGateRate}%`)}`);
  console.log(`Total Agent Retries     : ${metrics.totalRetries}`);
  console.log(`Estimated Tokens Used   : ${metrics.totalTokens.toLocaleString()} tokens`);
  console.log(`Human Approvals Handled : ${metrics.humanApprovals}`);

  if (Object.keys(metrics.gateFailureTypes).length > 0) {
    console.log(color.yellow("\nFailure Breakdown by Gate:"));
    for (const [gate, count] of Object.entries(metrics.gateFailureTypes)) {
      console.log(`- ${gate.toUpperCase()}: ${count} failures`);
    }
  }
}

async function commandTrain(args) {
  const projectRoot = process.cwd();
  const nIdx = args.findIndex((a) => a === "--from-last-N");
  const lastN = nIdx >= 0 ? parseInt(args[nIdx + 1], 10) : 10;
  const isApply = args.includes("--apply");

  const telemetry = new TelemetryCollector({ projectRoot });
  const suggestions = telemetry.generateSuggestions(lastN);

  console.log(color.blue(`→ Running Governed Learning & Pattern Extraction (last ${lastN} runs)...`));

  if (suggestions.length === 0) {
    console.log(color.green("✔ No recurring failure patterns detected across recent execution telemetry."));
    return;
  }

  console.log(color.yellow(`\n⚠ Detected ${suggestions.length} Optimization Opportunities:`));
  for (const s of suggestions) {
    console.log(`- [${s.targetRole.toUpperCase()}] Recurring failure on '${s.gateType}' (${s.failureCount}x occurrences)`);
    console.log(`  Recommendation: ${s.recommendation}`);
  }

  if (isApply) {
    const memoryDir = path.join(projectRoot, ".autoforge", "ai", "memory");
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    const learningsPath = path.join(memoryDir, "learnings.yaml");
    const doc = [
      `# AutoForge Governed Learnings`,
      `updatedAt: "${new Date().toISOString()}"`,
      `suggestions:`,
      ...suggestions.map((s) => `  - role: "${s.targetRole}"\n    gate: "${s.gateType}"\n    recommendation: "${s.recommendation}"`),
      "",
    ].join("\n");
    await writeFile(learningsPath, doc, "utf8");
    console.log(color.green(`\n✔ Applied learning patches to .autoforge/ai/memory/learnings.yaml`));
  } else {
    console.log(
      color.yellow(
        `\nTip: Run ${color.green("autoforge train --apply")} to write these optimizations into .autoforge/ai/memory/learnings.yaml`,
      ),
    );
  }
}

function formatTimestampISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    "-" +
    pad(d.getUTCMonth() + 1) +
    "-" +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    ":" +
    pad(d.getUTCMinutes()) +
    ":" +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

async function listMemoryFiles(autoforgeDir) {
  const memDir = path.join(autoforgeDir, "ai", "memory");
  try {
    const fsp = await import("node:fs/promises");
    const entries = await fsp.readdir(memDir, {
      withFileTypes: true,
    });
    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e) => {
          const full = path.join(memDir, e.name);
          const stat = await fsp.stat(full);
          return { name: e.name, mtimeMs: stat.mtimeMs };
        }),
    );
    const memFiles = files
      .map((o) => o.name)
      .filter((n) => /\.(md|ya?ml)$/.test(n));
    if (memFiles.length === 0) return [];
    const active = memFiles.filter((n) => /ACTIVE_MEMORY\./i.test(n));
    if (active.length) return [active[0]];
    // Pick the most recently modified memory file
    const latest = files
      .filter((o) => /\.(md|ya?ml)$/.test(o.name))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
    return latest ? [latest.name] : [];
  } catch {
    return [];
  }
}

async function commandRefresh() {
  const projectRoot = process.cwd();
  const autoforgeDir = await resolveAutoforgeDir(projectRoot);
  if (!(await pathExists(autoforgeDir))) {
    throw new Error(
      `${DEFAULT_DIRNAME}/ directory not found. Run \`autoforge init\` first.`,
    );
  }
  const timestamp = formatTimestampISO();
  const dirBase = path.basename(autoforgeDir);
  const filesToLoad = [
    `${dirBase}/ai/context.manifest.yaml`,
    `${dirBase}/ai/agents.yaml`,
    `${dirBase}/ai/AGENTS.md`,
    `${dirBase}/docs/ai/COMMIT_PLAYBOOK.md`,
    `${dirBase}/docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md`,
  ];
  const memoryFiles = await listMemoryFiles(autoforgeDir);
  const memoryPaths = memoryFiles.map((f) => `${dirBase}/ai/memory/${f}`);
  const all = [...filesToLoad, ...memoryPaths];

  const prompt = [
    "Read and reload the latest AutoForge context.",
    "Load these files in order:",
    ...all.map((p) => `- ${p}`),
    "",
    "Acknowledge that managed files (ai/code_targets.yaml, ai/context_targets.yaml) are generated from autoforge.config.json and should not be edited directly.",
    "Confirm you have reloaded rules, roles, progress, and memory.",
  ].join("\n");

  const outDir = path.join(autoforgeDir, "ai", "logs", "mastermind");
  await mkdir(path.join(outDir), { recursive: true });
  const outPath = path.join(outDir, `context_refresh_${timestamp}.md`);
  const refreshDoc = [
    `# Context Refresh ${timestamp}`,
    "",
    "Paste the block below into your coding assistant to force a context reload:",
    "",
    "```",
    prompt,
    "```",
    "",
    "Files referenced:",
    ...all.map((p) => `- ${p}`),
    "",
  ].join("\n");
  await writeFile(outPath, refreshDoc, "utf8");

  console.log(color.green("✔ Generated context refresh prompt"));
  console.log(color.blue(`→ ${path.relative(projectRoot, outPath)}`));
  console.log("\nCopy/paste this into your AI tool:\n");
  console.log(prompt);
}

async function commandLoad() {
  // Prefer the lightweight load stub if present; fall back to refresh
  const projectRoot = process.cwd();
  const autoforgeDir = await resolveAutoforgeDir(projectRoot);
  if (!(await pathExists(autoforgeDir))) {
    throw new Error(
      `${DEFAULT_DIRNAME}/ directory not found. Run \`autoforge init\` first.`,
    );
  }

  // Prefer new docs-based orchestrator context; fallback to legacy ai/prompts path
  const contextPathDocs = path.join(
    autoforgeDir,
    "docs",
    "ORCHESTRATOR_CONTEXT.md",
  );
  const contextPathLegacy = path.join(
    autoforgeDir,
    "ai",
    "prompts",
    "orchestrator_context.md",
  );
  const contextPath = (await pathExists(contextPathDocs))
    ? contextPathDocs
    : contextPathLegacy;
  if (await pathExists(contextPath)) {
    const context = await readFile(contextPath, "utf8");
    const dirBase = path.basename(autoforgeDir);
    const shortPrompt = [
      "Read and reload the latest AutoForge context.",
      "Load these files in order:",
      `- ${dirBase}/ai/context.manifest.yaml`,
      `- ${dirBase}/ai/agents.yaml`,
      `- ${dirBase}/ai/AGENTS.md`,
      `- ${dirBase}/ai/rules/README.md`,
      `- ${dirBase}/ai/rules/enforcement.yaml`,
      `- ${dirBase}/docs/ai/COMMIT_PLAYBOOK.md`,
      `- ${dirBase}/docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md`,
      "",
      "Acknowledge that managed files (ai/code_targets.yaml, ai/context_targets.yaml) are generated from autoforge.config.json and should not be edited directly.",
      "Confirm you have reloaded rules, roles, progress, and memory.",
      "",
      "Then read the full orchestrator context below (single session, multi‑role).",
      "After loading, reply: AutoForge context loaded (strict). Ready for your prompt.",
      "",
      "--- Orchestrator Context ---",
      context,
    ].join("\n");
    console.log(
      color.green(
        "✔ AutoForge load prompt (copy/paste this into your AI tool):\n",
      ),
    );
    console.log(shortPrompt);
    return;
  }
  // Fallback: generate broader context refresh prompt
  await commandRefresh();
}

async function commandDoctor() {
  const projectRoot = process.cwd();
  const autoforgeDir = await resolveAutoforgeDir(projectRoot);
  const configPath = path.join(projectRoot, CONFIG_FILE);
  const issues = [];

  if (!(await pathExists(autoforgeDir))) {
    issues.push(
      `${DEFAULT_DIRNAME}/ directory is missing. Run \`autoforge init\`.`,
    );
  }
  if (!(await pathExists(configPath))) {
    issues.push(
      `${CONFIG_FILE} is missing. Run \`autoforge init\` to regenerate or restore it.`,
    );
  }
  for (const required of ["ai/context.manifest.yaml", "ai/agents.yaml"]) {
    const filePath = path.join(autoforgeDir, required);
    if (!(await pathExists(filePath))) {
      issues.push(
        `Missing required file: ${path.relative(projectRoot, filePath)}`,
      );
    }
  }

  if (issues.length) {
    console.log(color.red("✗ Issues detected:"));
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
    process.exitCode = 1;
  } else {
    console.log(color.green("✔ AutoForge installation looks good!"));
  }
}

async function commandVersion() {
  const pkgPath = path.join(packageRoot, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  console.log(`AutoForge CLI version ${pkg.version}`);
}

async function run() {
  const [, , cmd, ...rest] = process.argv;
  try {
    switch (cmd) {
      case "init":
        await commandInit(rest);
        break;
      case "configure":
        await commandConfigure(rest);
        break;
      case "snapshot":
        await commandSnapshot(rest);
        break;
      case "load":
        await commandLoad();
        break;
      case "autopilot":
        await commandAutopilot(rest);
        break;
      case "research":
        await commandResearch(rest);
        break;
      case "readiness":
        await commandReadiness();
        break;
      case "train":
        await commandTrain(rest);
        break;
      case "metrics":
        await commandMetrics();
        break;
      case "status":
        await commandStatus(rest);
        break;
      case "approve":
        await commandApprove(rest);
        break;
      case "doctor":
        await commandDoctor();
        break;
      case "refresh":
        await commandRefresh();
        break;
      case "version":
      case "--version":
      case "-v":
        await commandVersion();
        break;
      case "help":
      case undefined:
        printUsage();
        break;
      default:
        console.error(color.red(`Unknown command: ${cmd}`));
        printUsage();
        process.exitCode = 1;
    }
  } catch (err) {
    console.error(color.red(`Error: ${err.message}`));
    process.exitCode = 1;
  }
}

run();
