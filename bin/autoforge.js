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
import yaml from "yaml";
import { globSync } from "glob";
import { readFileSync } from "node:fs";

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
  autoforge upgrade
  autoforge configure
  autoforge load
  autoforge refresh
  autoforge snapshot [targetDir]
  autoforge validate
  autoforge doctor
  autoforge version
  autoforge help
  autoforge dryrun [recipeName]
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
    console.log(color.yellow(`⚠ Removing existing ${DEFAULT_DIRNAME}/ (force mode)`));
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
    if (parts[0] === "bin" || parts[0] === CONFIG_FILE || parts[0] === "repomix.config.json") {
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
    console.log(color.yellow(`No ${DEFAULT_DIRNAME}/ directory found. Running init instead.`));
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
    throw new Error(`${DEFAULT_DIRNAME}/ directory not found. Run \`autoforge init\` first.`);
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
  const patterns = [path.join(recipesDir, "*.yaml"), path.join(recipesDir, "*.yml")];
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

async function commandDryrun(args) {
  const projectRoot = process.cwd();
  const name = args[0];
  const loaded = loadRecipeByName(projectRoot, name);
  if (!loaded) {
    console.log(color.yellow("No recipes found under docs/blueprint/recipes/."));
    console.log("Create one (e.g., docs/blueprint/recipes/web_app.yaml) and retry.");
    return;
  }
  const { file, recipe } = loaded;
  console.log(color.blue(`→ Dry run for recipe: ${recipe.name || path.basename(file)}`));
  console.log(color.yellow("(No files will be written.)\n"));

  // Preflight checks
  const checks = [
    { label: "ideas present", pattern: path.join(projectRoot, "ideas", "*.yaml") },
    { label: "PRD present", path: path.join(projectRoot, "docs", "prd", "PRODUCT_REQUIREMENTS.md") },
    { label: "API contract present", path: path.join(projectRoot, "api", "openapi.yaml") },
  ];
  console.log(color.blue("Preflight checks:"));
  for (const c of checks) {
    let ok = false;
    if (c.path) ok = await pathExists(c.path);
    else if (c.pattern) ok = globSync(c.pattern, { nodir: true }).length > 0;
    console.log(`- ${c.label}: ${ok ? color.green("OK") : color.red("MISSING")}`);
  }
  console.log("");

  // Plan outline
  console.log(color.blue("Execution plan:"));
  const stages = Array.isArray(recipe.stages) ? recipe.stages : [];
  if (stages.length === 0) {
    console.log(color.red("No stages defined in recipe."));
  } else {
    stages.forEach((s, i) => {
      const approvals = Array.isArray(s.approvals) ? s.approvals.join(", ") : "";
      console.log(`${i + 1}. ${s.id} — role: ${s.role}${approvals ? ` (approvals: ${approvals})` : ""}`);
      if (Array.isArray(s.deliverables) && s.deliverables.length) {
        console.log(`   deliverables: ${s.deliverables.join(", ")}`);
      }
    });
  }
  console.log("");

  // CI templates
  if (Array.isArray(recipe.ci_templates) && recipe.ci_templates.length) {
    console.log(color.blue("Suggested CI templates:"));
    for (const t of recipe.ci_templates) {
      console.log(`- ${t}`);
    }
    console.log("");
  }

  // Next steps
  console.log(color.blue("Next steps:"));
  console.log("- Review the plan above and suggest edits.");
  console.log("- Approve the recipe selection.");
  console.log("- In Chat Mode: run 'Execute .autoforge/ai/prompts/automation_bootstrap.yaml' to proceed with approvals.");
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
    throw new Error(`${DEFAULT_DIRNAME}/ directory not found. Run \`autoforge init\` first.`);
  }
  const timestamp = formatTimestampISO();
  const dirBase = path.basename(autoforgeDir);
  const filesToLoad = [
    `${dirBase}/ai/context.manifest.yaml`,
    `${dirBase}/ai/agents.yaml`,
    `${dirBase}/ai/AGENTS.md`,
    `${dirBase}/docs/ai/COMMIT_PLAYBOOK.md`,
    `docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md`,
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
  // Alias for refresh to support first-run onboarding
  await commandRefresh();
}

async function commandDoctor() {
  const projectRoot = process.cwd();
  const autoforgeDir = await resolveAutoforgeDir(projectRoot);
  const configPath = path.join(projectRoot, CONFIG_FILE);
  const issues = [];

  if (!(await pathExists(autoforgeDir))) {
    issues.push(`${DEFAULT_DIRNAME}/ directory is missing. Run \`autoforge init\`.`);
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
      case "dryrun":
        await commandDryrun(rest);
        break;
      case "upgrade":
        await commandUpgrade();
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
      case "refresh":
        await commandRefresh();
        break;
      case "validate":
        await commandValidate();
        break;
      case "doctor":
        await commandDoctor();
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
