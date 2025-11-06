#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function resolveAutoforgeDir(repoRoot) {
  const hidden = path.join(repoRoot, ".autoforge");
  const legacy = path.join(repoRoot, "autoforge");
  if (fs.existsSync(hidden)) return hidden;
  if (fs.existsSync(legacy)) return legacy;
  return path.join(repoRoot, ".autoforge");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJSONL(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\n+/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function main() {
  const repoRoot = process.cwd();
  const af = resolveAutoforgeDir(repoRoot);
  const logsFile = path.join(af, "ai", "logs", "activity.jsonl");
  const outDir = path.join(af, "ai", "training_data");
  ensureDir(outDir);
  const events = readJSONL(logsFile);

  const supervised = [];
  const approvals = [];
  const repairs = [];
  for (const e of events) {
    if (
      e.stage === "code_plan" ||
      e.stage === "test_plan" ||
      e.stage === "design_spec" ||
      e.stage === "style_diff"
    ) {
      supervised.push({
        input: { stage: e.stage },
        output: e.artifact || null,
      });
    }
    if (e.type === "approval_decision") {
      approvals.push({
        id: e.id,
        action: e.action,
        granted: e.granted,
        note: e.note || "",
        ts: e.ts,
      });
    }
    if (
      e.stage === "post_compliance" &&
      e.postCompliance &&
      e.postCompliance.summary &&
      /failed/i.test(e.postCompliance.summary)
    ) {
      repairs.push({
        when: e.ts,
        summary: e.postCompliance.summary,
        changed_files: e.postCompliance.changed_files || [],
      });
    }
  }
  fs.writeFileSync(
    path.join(outDir, "supervised.jsonl"),
    supervised.map((o) => JSON.stringify(o)).join("\n") + "\n",
  );
  console.log(
    `Exported supervised dataset with ${supervised.length} records to ${path.relative(repoRoot, outDir)}`,
  );
  fs.writeFileSync(
    path.join(outDir, "approvals.jsonl"),
    approvals.map((o) => JSON.stringify(o)).join("\n") + "\n",
  );
  console.log(`Exported approvals dataset with ${approvals.length} records.`);
  fs.writeFileSync(
    path.join(outDir, "repairs.jsonl"),
    repairs.map((o) => JSON.stringify(o)).join("\n") + "\n",
  );
  console.log(`Exported repairs dataset with ${repairs.length} records.`);
}

main();
