#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    child.on("exit", (code) => resolve(code === 0));
  });
}

function loadConfig(projectRoot) {
  const cfgPath = path.join(projectRoot, "autoforge.config.json");
  if (!fs.existsSync(cfgPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    return {};
  }
}

function resolveFiles(cwd, filesArg) {
  if (!filesArg) return [];
  const parts = filesArg.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => (path.isAbsolute(p) ? p : path.resolve(cwd, p)));
}

async function main() {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  const filesIdx = args.findIndex((a) => a === "--files");
  const files = filesIdx >= 0 ? resolveFiles(cwd, args[filesIdx + 1]) : [];
  const allowWrite = args.includes("--format-write");

  const cfg = loadConfig(cwd).qualityPolicies || {};
  const out = { steps: [], success: true };

  // Detect changed-file scope for lint/format; fallback to repo root if none provided
  const scope = files.length ? files : [];

  // 1) Parse checks for JSON/YAML/MD (basic syntax only here)
  const parseTargets = scope.filter((f) => /\.(json|ya?ml|md)$/i.test(f));
  let parseOk = true;
  for (const file of parseTargets) {
    try {
      const data = fs.readFileSync(file, "utf8");
      if (/\.json$/i.test(file)) JSON.parse(data);
      if (/\.ya?ml$/i.test(file)) {
        const yaml = await import("yaml");
        yaml.parse(data);
      }
      // MD: rely on later linting if configured; here only ensure file is readable
    } catch (err) {
      parseOk = false;
      console.error(`Parse error in ${file}: ${err.message}`);
    }
  }
  out.steps.push({ id: "parse", success: parseOk, files: parseTargets });
  out.success &&= parseOk;

  // 2) Prettier
  let prettierOk = true;
  if (cfg.format?.cmdCheck) {
    prettierOk = await run("sh", ["-c", cfg.format.cmdCheck]);
  } else {
    const targets = scope.filter((f) => /\.(js|jsx|ts|tsx|json|md|css|scss|yaml|yml|html)$/i.test(f));
    if (targets.length) {
      prettierOk = await run("npx", ["--yes", "prettier", "--check", ...targets]);
      if (!prettierOk && allowWrite) {
        await run("npx", ["--yes", "prettier", "--write", ...targets]);
        prettierOk = await run("npx", ["--yes", "prettier", "--check", ...targets]);
      }
    }
  }
  out.steps.push({ id: "prettier", success: prettierOk });
  out.success &&= prettierOk;

  // 3) ESLint
  let eslintOk = true;
  if (cfg.lint?.cmd) {
    const lintCmd = cfg.lint.cmd + (cfg.lint.maxWarnings === 0 ? " --max-warnings=0" : "");
    eslintOk = await run("sh", ["-c", lintCmd]);
  } else {
    const targets = scope.filter((f) => /\.(js|jsx|ts|tsx)$/i.test(f));
    if (targets.length) {
      const base = ["--yes", "eslint", "--max-warnings=0", ...targets];
      eslintOk = await run("npx", base);
      if (!eslintOk && allowWrite) {
        await run("npx", ["--yes", "eslint", "--fix", ...targets]);
        eslintOk = await run("npx", base);
      }
    }
  }
  out.steps.push({ id: "eslint", success: eslintOk });
  out.success &&= eslintOk;

  // 4) TypeScript
  let tscOk = true;
  if (cfg.typecheck?.cmd) {
    tscOk = await run("sh", ["-c", cfg.typecheck.cmd]);
  } else {
    tscOk = await run("npx", ["--yes", "tsc", "--noEmit"]);
  }
  out.steps.push({ id: "tsc", success: tscOk });
  out.success &&= tscOk;

  // 5) Tests (optional, quick)
  let testsOk = true;
  if (cfg.tests?.cmd && cfg.tests.runOnChanged !== false) {
    testsOk = await run("sh", ["-c", cfg.tests.cmd]);
    out.steps.push({ id: "tests", success: testsOk });
    out.success &&= testsOk;
  }

  console.log("\nQuality gates result:");
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = out.success ? 0 : 1;
}

main();

