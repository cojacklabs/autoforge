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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const distRoot = path.join(packageRoot, "dist");
const CONFIG_FILE = "autoforge.config.json";
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

async function prepareAutoforgeFolder(projectRoot, { force = false } = {}) {
  const targetDir = path.join(projectRoot, "autoforge");
  const exists = await pathExists(targetDir);
  if (exists && !force) {
    throw new Error(
      `autoforge/ already exists. Re-run with --force to overwrite.`,
    );
  }
  if (exists && force) {
    console.log(color.yellow(`⚠ Removing existing autoforge/ (force mode)`));
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
    if (parts[0] === "bin" || parts[0] === CONFIG_FILE) {
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
  const autoforgeDir = path.join(projectRoot, "autoforge");
  if (!(await pathExists(autoforgeDir))) {
    console.log(
      color.yellow("No autoforge/ directory found. Running init instead."),
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
  await applyConfiguration(projectRoot);
  console.log(color.green("✔ AutoForge upgraded"));
}

async function commandValidate() {
  const projectRoot = process.cwd();
  const autoforgeDir = path.join(projectRoot, "autoforge");
  if (!(await pathExists(autoforgeDir))) {
    throw new Error(
      "autoforge/ directory not found. Run `autoforge init` first.",
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
  const autoforgeDir = path.join(projectRoot, "autoforge");
  if (!(await pathExists(autoforgeDir))) {
    throw new Error("autoforge/ directory not found. Run `autoforge init` first.");
  }
  const timestamp = formatTimestampISO();
  const filesToLoad = [
    "autoforge/ai/context.manifest.yaml",
    "autoforge/ai/agents.yaml",
    "autoforge/ai/AGENTS.md",
    "autoforge/docs/ai/COMMIT_PLAYBOOK.md",
  ];
  const memoryFiles = await listMemoryFiles(autoforgeDir);
  const memoryPaths = memoryFiles.map((f) => `autoforge/ai/memory/${f}`);
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
  const autoforgeDir = path.join(projectRoot, "autoforge");
  const configPath = path.join(projectRoot, CONFIG_FILE);
  const issues = [];

  if (!(await pathExists(autoforgeDir))) {
    issues.push("autoforge/ directory is missing. Run `autoforge init`.");
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
