#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

async function loadAjv() {
  try {
    const mod = await import("ajv");
    return new mod.default({ allErrors: true, strict: false });
  } catch {
    return null;
  }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function schemaPathFromId(projectRoot, idOrName) {
  const schemasDir = path.join(projectRoot, "ai", "schemas");
  if (fs.existsSync(idOrName)) return idOrName;
  const fname = idOrName.endsWith(".json") ? idOrName : `${idOrName}.json`;
  const p = path.join(schemasDir, fname);
  if (fs.existsSync(p)) return p;
  // allow short names like UserAsk.v1
  const short = path.join(schemasDir, fname.replace(/\.json$/i, ""));
  if (fs.existsSync(short)) return short;
  return null;
}

async function main() {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  const schemaArgIdx = args.findIndex((a) => a === "--schema");
  const filesIdx = args.findIndex((a) => a === "--files");
  const schemaName = schemaArgIdx >= 0 ? args[schemaArgIdx + 1] : null;
  const files =
    filesIdx >= 0
      ? args[filesIdx + 1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  if (!schemaName || files.length === 0) {
    console.error(
      "Usage: validate_artifacts --schema <SchemaFileOrId> --files <file1.json,file2.json>",
    );
    process.exit(1);
  }

  const ajv = await loadAjv();
  if (!ajv) {
    console.error("Ajv not found. Please install it: npm i -D ajv");
    process.exit(1);
  }

  const schemaPath = schemaPathFromId(cwd, schemaName);
  if (!schemaPath) {
    console.error(`Schema not found: ${schemaName}`);
    process.exit(1);
  }
  const schema = readJson(schemaPath);
  const validate = ajv.compile(schema);

  const results = [];
  let ok = true;
  for (const rel of files) {
    const file = path.isAbsolute(rel) ? rel : path.join(cwd, rel);
    try {
      const data = readJson(file);
      const valid = validate(data);
      results.push({ file, valid, errors: valid ? [] : validate.errors });
      if (!valid) ok = false;
    } catch (err) {
      results.push({ file, valid: false, errors: [{ message: err.message }] });
      ok = false;
    }
  }

  const payload = { schema: path.basename(schemaPath), results, success: ok };
  console.log(JSON.stringify(payload, null, 2));
  process.exitCode = ok ? 0 : 1;
}

main();
