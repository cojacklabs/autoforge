import { readFile } from "node:fs/promises";
import path from "node:path";

export interface VisionCheckResult {
  conflict: boolean;
  reasons: string[];
}

export async function checkVisionConflict(
  projectRoot: string,
  idea: string,
): Promise<VisionCheckResult> {
  const vision = await readFile(
    path.join(path.resolve(projectRoot), "VISION.md"),
    "utf8",
  );
  const nonGoals = vision
    .split(/^## /m)
    .filter((section) => section.startsWith("Non-Goals\n"))
    .flatMap((section) =>
      section
        .split("\n")
        .slice(1)
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean),
    );
  const normalizedIdea = idea.toLowerCase();
  const reasons = nonGoals
    .filter((nonGoal) => {
      const terms = nonGoal
        .toLowerCase()
        .split(/\W+/)
        .filter((term) => term.length > 3);
      return (
        terms.length > 0 && terms.every((term) => normalizedIdea.includes(term))
      );
    })
    .map((nonGoal) => `Idea overlaps explicit non-goal: ${nonGoal}`);
  return { conflict: reasons.length > 0, reasons };
}
