import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sources = [
  ["AUTOFORGE_FOUNDATION.md", "dev/AutoForge_Foundation.md"],
  ["ROADMAP_0.8_TO_0.10.md", "dev/AutoForge_Development_Roadmap_0.8-0.10.md"],
  ["DESIGN_SPECIFICATION_STANDARD.md", "dev/Design_Specification_Standard.md"],
  [
    "CODEX_IMPLEMENTATION_PLAN_0.8_TO_0.10.md",
    "dev/Codex_Implementation_Plan_0.8-0.10.md",
  ],
];

const bundle = await readFile(
  path.join(root, "dev/AutoForge_Planning_Bundle.md"),
  "utf8",
);
const missing = [];
for (const [marker, source] of sources) {
  if (!bundle.includes(`# File: ${marker}`)) missing.push(source);
  const content = await readFile(path.join(root, source), "utf8");
  if (!bundle.includes(content.trim())) missing.push(source);
}
if (missing.length > 0) {
  console.error(
    `Planning Bundle is out of sync; missing source content: ${[...new Set(missing)].join(", ")}`,
  );
  process.exitCode = 1;
} else {
  console.log("Planning Bundle source content is synchronized.");
}
