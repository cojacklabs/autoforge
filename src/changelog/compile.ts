import type { Decision } from "../decisions/schemas.js";

export interface CompileChangelogInput {
  decisions: readonly Decision[];
  sinceTimestamp: string;
}

const KIND_HEADINGS: Record<string, string> = {
  bugfix: "### Fixed",
  "feature-note": "### Added",
};

const KIND_ORDER = ["feature-note", "bugfix"] as const;

export function compileChangelogSection(input: CompileChangelogInput): string {
  const sinceMs = Date.parse(input.sinceTimestamp);
  const qualifying = input.decisions.filter(
    (decision) =>
      (decision.kind === "bugfix" || decision.kind === "feature-note") &&
      Date.parse(decision.createdAt) > sinceMs,
  );
  if (qualifying.length === 0) {
    return "";
  }

  const sections: string[] = [];
  for (const kind of KIND_ORDER) {
    const forKind = qualifying
      .filter((decision) => decision.kind === kind)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    if (forKind.length === 0) {
      continue;
    }
    const bullets = forKind.map(
      (decision) => `- ${decision.statement} (${decision.id})`,
    );
    sections.push([KIND_HEADINGS[kind], "", ...bullets, ""].join("\n"));
  }
  return sections.join("\n");
}

const START_MARKER = "<!-- autoforge:changelog:start -->";
const END_MARKER = "<!-- autoforge:changelog:end -->";

export function upsertChangelogSection(
  existingChangelog: string,
  compiledSection: string,
): string {
  const startIndex = existingChangelog.indexOf(START_MARKER);
  const endIndex = existingChangelog.indexOf(END_MARKER);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      "CHANGELOG.md is missing the autoforge:changelog start/end markers required for compilation.",
    );
  }
  const before = existingChangelog.slice(0, startIndex + START_MARKER.length);
  const after = existingChangelog.slice(endIndex);
  const body =
    compiledSection.trim().length > 0
      ? `\n${compiledSection.trim()}\n\n`
      : "\n";
  return `${before}${body}${after}`;
}
