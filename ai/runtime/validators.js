// Lightweight validators interface for orchestrator use.
// Note: CLI script wrappers exist in scripts/run_quality_gates.js and scripts/validate_artifacts.js

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("exit", (code) => resolve(code === 0));
  });
}

export async function parseChecks(files = []) {
  let ok = true;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const data = fs.readFileSync(file, "utf8");
    try {
      if (/\.json$/i.test(file)) JSON.parse(data);
      if (/\.ya?ml$/i.test(file)) {
        const yaml = await import("yaml");
        yaml.parse(data);
      }
    } catch {
      ok = false;
    }
  }
  return ok;
}

export async function prettierCheck(files = [], { write = false } = {}) {
  if (!files.length) return true;
  const base = ["--yes", "prettier", "--check", ...files];
  let ok = await run("npx", base);
  if (!ok && write) {
    await run("npx", ["--yes", "prettier", "--write", ...files]);
    ok = await run("npx", base);
  }
  return ok;
}

export async function eslintCheck(files = [], { fix = false } = {}) {
  const targets = files.filter((f) => /\.(js|jsx|ts|tsx)$/i.test(f));
  if (!targets.length) return true;
  const base = ["--yes", "eslint", "--max-warnings=0", ...targets];
  let ok = await run("npx", base);
  if (!ok && fix) {
    await run("npx", ["--yes", "eslint", "--fix", ...targets]);
    ok = await run("npx", base);
  }
  return ok;
}

export async function tscCheck(projectRoot = process.cwd()) {
  return run("npx", ["--yes", "tsc", "--noEmit"], { cwd: projectRoot });
}

export async function validateJsonWithSchema(schemaPath, jsonFiles = []) {
  let ajv;
  try {
    const mod = await import("ajv");
    ajv = new mod.default({ allErrors: true, strict: false });
  } catch {
    throw new Error(
      "Ajv not installed. Please add it to your devDependencies.",
    );
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const validate = ajv.compile(schema);
  const results = [];
  let ok = true;
  for (const f of jsonFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(f, "utf8"));
      const valid = validate(data);
      results.push({ file: f, valid, errors: valid ? [] : validate.errors });
      if (!valid) ok = false;
    } catch (err) {
      results.push({
        file: f,
        valid: false,
        errors: [{ message: err.message }],
      });
      ok = false;
    }
  }
  return { ok, results };
}
