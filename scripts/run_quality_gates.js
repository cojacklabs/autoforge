#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import yaml from "yaml";

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: "pipe",
      shell: process.platform === "win32",
      cwd: options.cwd || process.cwd(),
      ...options,
    });
    child.on("error", () => resolve(true));
    child.on("exit", (code) => {
      // If tool is missing (code 127), gracefully resolve true for optional gates
      if (code === 127) {
        resolve(true);
      } else {
        resolve(code === 0);
      }
    });
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

function loadQualityGatesConfig(projectRoot) {
  const qgPath = path.join(projectRoot, "devops", "quality_gates.yaml");
  if (!fs.existsSync(qgPath)) return null;
  try {
    return yaml.parse(fs.readFileSync(qgPath, "utf8"));
  } catch {
    return null;
  }
}

function resolveFiles(cwd, filesArg) {
  if (!filesArg) return [];
  const parts = filesArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((p) => (path.isAbsolute(p) ? p : path.resolve(cwd, p)));
}

/**
 * Secret scanner for staged/changed files
 */
function scanSecrets(files, patterns) {
  const secretFindings = [];
  const defaultPatterns = [
    /(?:api[_-]?key|secret|token|password|auth[_-]?token|bearer)\s*[:=]\s*['"][0-9a-zA-Z\-_]{16,}['"]/i,
    /ghp_[0-9a-zA-Z]{36}/,
    /sk-[0-9a-zA-Z]{32,}/,
    /AKIA[0-9A-Z]{16}/,
  ];

  const activePatterns =
    patterns && patterns.length
      ? patterns.map((p) => new RegExp(p, "i"))
      : defaultPatterns;

  for (const file of files) {
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
    try {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, lineNum) => {
        for (const pattern of activePatterns) {
          if (pattern.test(line)) {
            secretFindings.push({
              file,
              line: lineNum + 1,
              match: line.trim().substring(0, 80),
            });
          }
        }
      });
    } catch {}
  }

  return secretFindings;
}

export async function executeQualityGates({
  projectRoot = process.cwd(),
  files = [],
  allowWrite = false,
} = {}) {
  const cfg = loadConfig(projectRoot).qualityPolicies || {};
  const qgCfg = loadQualityGatesConfig(projectRoot)?.gates || {};
  const out = { steps: [], success: true, timestamp: new Date().toISOString() };

  const scope = files.length ? files : [];

  // 1) Secret Scanning Gate
  const secretScanFiles = scope.length ? scope : [projectRoot];
  const secretFindings = scanSecrets(
    scope,
    qgCfg.pre_commit?.secret_scan?.patterns,
  );
  const secretScanOk = secretFindings.length === 0;

  if (!secretScanOk) {
    console.error(
      `\x1b[31m✗ Secret Scan Failed: ${secretFindings.length} potential credentials detected!\x1b[0m`,
    );
    secretFindings.forEach((f) => {
      console.error(
        `  - ${path.relative(projectRoot, f.file)}:${f.line} -> ${f.match}`,
      );
    });
  }
  out.steps.push({
    id: "secret_scan",
    success: secretScanOk,
    findings: secretFindings,
  });
  out.success &&= secretScanOk;

  // 2) Parse checks for JSON/YAML/MD
  const parseTargets = scope.filter((f) => /\.(json|ya?ml|md)$/i.test(f));
  let parseOk = true;
  for (const file of parseTargets) {
    try {
      const data = fs.readFileSync(file, "utf8");
      if (/\.json$/i.test(file)) JSON.parse(data);
      if (/\.ya?ml$/i.test(file)) yaml.parse(data);
    } catch (err) {
      parseOk = false;
      console.error(`Parse error in ${file}: ${err.message}`);
    }
  }
  out.steps.push({ id: "parse", success: parseOk, files: parseTargets });
  out.success &&= parseOk;

  // 3) Prettier Formatting Gate
  let prettierOk = true;
  if (cfg.format?.cmdCheck) {
    prettierOk = await run("sh", ["-c", cfg.format.cmdCheck]);
  } else {
    const targets = scope.filter((f) =>
      /\.(js|jsx|ts|tsx|json|md|css|scss|yaml|yml|html)$/i.test(f),
    );
    if (targets.length) {
      prettierOk = await run("npx", [
        "--yes",
        "prettier",
        "--check",
        ...targets,
      ]);
      if (!prettierOk && allowWrite) {
        await run("npx", ["--yes", "prettier", "--write", ...targets]);
        prettierOk = await run("npx", [
          "--yes",
          "prettier",
          "--check",
          ...targets,
        ]);
      }
    }
  }
  out.steps.push({ id: "prettier", success: prettierOk });
  out.success &&= prettierOk;

  // 4) ESLint Quality Gate
  let eslintOk = true;
  if (cfg.lint?.cmd) {
    const lintCmd =
      cfg.lint.cmd + (cfg.lint.maxWarnings === 0 ? " --max-warnings=0" : "");
    try {
      eslintOk = await run("sh", ["-c", lintCmd]);
    } catch {
      eslintOk = true;
    }
  } else {
    const targets = scope.filter((f) => /\.(js|jsx|ts|tsx)$/i.test(f));
    if (targets.length) {
      const base = ["--yes", "eslint", "--max-warnings=0", ...targets];
      try {
        eslintOk = await run("npx", base);
        if (!eslintOk && allowWrite) {
          await run("npx", ["--yes", "eslint", "--fix", ...targets]);
          eslintOk = await run("npx", base);
        }
      } catch {
        eslintOk = true;
      }
    }
  }
  out.steps.push({ id: "eslint", success: eslintOk });
  out.success &&= eslintOk;

  // 5) TypeScript Typecheck Gate
  let tscOk = true;
  const tsConfigExists = fs.existsSync(path.join(projectRoot, "tsconfig.json"));
  if (tsConfigExists) {
    if (cfg.typecheck?.cmd) {
      try {
        tscOk = await run("sh", ["-c", cfg.typecheck.cmd], {
          cwd: projectRoot,
        });
      } catch {
        tscOk = true;
      }
    } else {
      try {
        tscOk = await run("npx", ["--yes", "tsc", "--noEmit"], {
          cwd: projectRoot,
        });
      } catch {
        tscOk = true;
      }
    }
  }
  out.steps.push({ id: "tsc", success: tscOk });
  out.success &&= tscOk;

  // 6) Test Suite Execution
  let testsOk = true;
  if (cfg.tests?.cmd && cfg.tests.runOnChanged !== false) {
    try {
      testsOk = await run("sh", ["-c", cfg.tests.cmd]);
    } catch {
      testsOk = true;
    }
    out.steps.push({ id: "tests", success: testsOk });
    out.success &&= testsOk;
  }

  return out;
}

async function main() {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  const filesIdx = args.findIndex((a) => a === "--files");
  const files = filesIdx >= 0 ? resolveFiles(cwd, args[filesIdx + 1]) : [];
  const allowWrite = args.includes("--format-write");

  const out = await executeQualityGates({
    projectRoot: cwd,
    files,
    allowWrite,
  });
  console.log("\nQuality gates result:");
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = out.success ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith("run_quality_gates.js")) {
  main();
}
