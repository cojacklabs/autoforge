// Engineer adapter: generate an apply plan from CodePlan.
// By default, returns a dry-run set of intended writes without touching files.

import path from "node:path";

export function planDiffs(codePlan, { repoRoot, allowedRoots = [] } = {}) {
  const writes = [];
  const violations = [];
  for (const change of codePlan.changes || []) {
    const abs = path.resolve(repoRoot || process.cwd(), change.path);
    const insideAny =
      allowedRoots.length === 0 ||
      allowedRoots.some((root) => {
        const rel = path.relative(root, abs);
        return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
      });
    if (!insideAny) {
      violations.push({ path: change.path });
      continue;
    }
    writes.push({
      type: change.type,
      absPath: abs,
      relPath: change.path,
      symbol: change.symbol || null,
      description: change.description,
    });
  }
  return { writes, violations };
}

export function applyWrites(plan, { fs, dryRun = true } = {}) {
  const results = [];
  for (const w of plan.writes) {
    if (dryRun) {
      results.push({ path: w.relPath, action: "noop", ok: true });
      continue;
    }
    try {
      const dir = path.dirname(w.absPath);
      fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(w.absPath)) {
        fs.writeFileSync(w.absPath, `// TODO: ${w.description}\n`);
      } else {
        fs.appendFileSync(w.absPath, `\n// AUTOFORGE: ${w.description}\n`);
      }
      results.push({ path: w.relPath, action: "write", ok: true });
    } catch (err) {
      results.push({
        path: w.relPath,
        action: "write",
        ok: false,
        error: err.message,
      });
    }
  }
  return results;
}
