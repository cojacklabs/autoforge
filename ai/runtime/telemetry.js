import fs from "node:fs";
import path from "node:path";

function resolveAutoforgeDir(repoRoot) {
  const hidden = path.join(repoRoot, ".autoforge");
  const legacy = path.join(repoRoot, "autoforge");
  if (fs.existsSync(hidden)) return hidden;
  if (fs.existsSync(legacy)) return legacy;
  return path.join(repoRoot, ".autoforge");
}

export function appendEvent(repoRoot, event) {
  try {
    const af = resolveAutoforgeDir(repoRoot);
    const logDir = path.join(af, "ai", "logs");
    fs.mkdirSync(logDir, { recursive: true });
    const file = path.join(logDir, "activity.jsonl");
    const line =
      JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
    fs.appendFileSync(file, line, "utf8");
  } catch {
    // best-effort only
  }
}
