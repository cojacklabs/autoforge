import { describe, expect, it } from "vitest";
import {
  compileChangelogSection,
  upsertChangelogSection,
} from "../../src/changelog/compile.js";
import type { Decision } from "../../src/decisions/schemas.js";

function decision(overrides: Partial<Decision>): Decision {
  return {
    id: "decision.example",
    statement: "Example statement.",
    reasoning: "Example reasoning.",
    consequences: ["Example consequence."],
    scope: ["example"],
    keywords: ["example"],
    relatedWork: [],
    supersedes: null,
    status: "active",
    kind: "architecture",
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("compileChangelogSection", () => {
  it("groups bugfix and feature-note decisions under Fixed/Added headings", () => {
    const section = compileChangelogSection({
      decisions: [
        decision({
          id: "decision.fix-enoent",
          statement: "Stores now resolve null instead of throwing ENOENT.",
          kind: "bugfix",
          createdAt: "2026-08-22T10:00:00.000Z",
        }),
        decision({
          id: "decision.add-changelog-compile",
          statement: "Add automatic changelog compilation from decisions.",
          kind: "feature-note",
          createdAt: "2026-08-22T11:00:00.000Z",
        }),
        decision({
          id: "decision.architecture-only",
          statement: "This should not appear in the changelog.",
          kind: "architecture",
          createdAt: "2026-08-22T12:00:00.000Z",
        }),
      ],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });
    expect(section).toContain("### Fixed");
    expect(section).toContain(
      "Stores now resolve null instead of throwing ENOENT.",
    );
    expect(section).toContain("### Added");
    expect(section).toContain(
      "Add automatic changelog compilation from decisions.",
    );
    expect(section).not.toContain("This should not appear in the changelog.");
  });

  it("excludes decisions created at or before sinceTimestamp", () => {
    const section = compileChangelogSection({
      decisions: [
        decision({
          statement: "Too old to include.",
          kind: "bugfix",
          createdAt: "2026-08-22T00:00:00.000Z",
        }),
      ],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });
    expect(section).toBe("");
  });

  it("returns an empty string when there are no qualifying decisions", () => {
    const section = compileChangelogSection({
      decisions: [],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });
    expect(section).toBe("");
  });
});

describe("compileChangelogSection (exact-match golden test)", () => {
  it("produces the exact expected multi-line output for a realistic set of decisions", () => {
    const section = compileChangelogSection({
      decisions: [
        decision({
          id: "decision.fix-enoent",
          statement: "Stores now resolve null instead of throwing ENOENT.",
          kind: "bugfix",
          createdAt: "2026-08-22T10:00:00.000Z",
        }),
        decision({
          id: "decision.fix-race-condition",
          statement: "Serialize concurrent writes to the decision store.",
          kind: "bugfix",
          createdAt: "2026-08-22T10:30:00.000Z",
        }),
        decision({
          id: "decision.add-changelog-compile",
          statement: "Add automatic changelog compilation from decisions.",
          kind: "feature-note",
          createdAt: "2026-08-22T11:00:00.000Z",
        }),
      ],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });

    expect(section).toBe(
      [
        "### Added",
        "",
        "- Add automatic changelog compilation from decisions. (decision.add-changelog-compile)",
        "",
        "### Fixed",
        "",
        "- Stores now resolve null instead of throwing ENOENT. (decision.fix-enoent)",
        "- Serialize concurrent writes to the decision store. (decision.fix-race-condition)",
        "",
      ].join("\n"),
    );
  });
});

describe("upsertChangelogSection", () => {
  const existing = [
    "# Changelog",
    "",
    "All notable changes to this project will be documented in this file.",
    "",
    "<!-- autoforge:changelog:start -->",
    "<!-- autoforge:changelog:end -->",
    "",
    "## [0.6.0] - 2026-08-16",
    "",
    "### Major Features",
    "",
    "- Old entry that must be preserved.",
    "",
  ].join("\n");

  it("inserts the compiled section between the markers", () => {
    const result = upsertChangelogSection(
      existing,
      "### Fixed\n\n- New fix.\n",
    );
    expect(result).toContain("<!-- autoforge:changelog:start -->");
    expect(result).toContain("### Fixed");
    expect(result).toContain("- New fix.");
    expect(result).toContain("<!-- autoforge:changelog:end -->");
    expect(result).toContain("## [0.6.0] - 2026-08-16");
    expect(result).toContain("- Old entry that must be preserved.");
  });

  it("is idempotent when re-run with the same section content", () => {
    const once = upsertChangelogSection(existing, "### Fixed\n\n- New fix.\n");
    const twice = upsertChangelogSection(once, "### Fixed\n\n- New fix.\n");
    expect(twice).toBe(once);
  });

  it("replaces prior compiled content on a subsequent run with different decisions", () => {
    const once = upsertChangelogSection(
      existing,
      "### Fixed\n\n- First fix.\n",
    );
    const twice = upsertChangelogSection(
      once,
      "### Fixed\n\n- First fix.\n- Second fix.\n",
    );
    expect(twice).toContain("- First fix.");
    expect(twice).toContain("- Second fix.");
    // The section appears exactly once, not duplicated:
    expect(twice.split("### Fixed").length - 1).toBe(1);
  });

  it("produces the exact expected output including a blank line after the start marker (exact-match golden test)", () => {
    const compiledSection = compileChangelogSection({
      decisions: [
        decision({
          id: "decision.fix-enoent",
          statement: "Stores now resolve null instead of throwing ENOENT.",
          kind: "bugfix",
          createdAt: "2026-08-22T10:00:00.000Z",
        }),
        decision({
          id: "decision.add-changelog-compile",
          statement: "Add automatic changelog compilation from decisions.",
          kind: "feature-note",
          createdAt: "2026-08-22T11:00:00.000Z",
        }),
      ],
      sinceTimestamp: "2026-08-22T00:00:00.000Z",
    });

    const result = upsertChangelogSection(existing, compiledSection);

    expect(result).toBe(
      [
        "# Changelog",
        "",
        "All notable changes to this project will be documented in this file.",
        "",
        "<!-- autoforge:changelog:start -->",
        "",
        "### Added",
        "",
        "- Add automatic changelog compilation from decisions. (decision.add-changelog-compile)",
        "",
        "### Fixed",
        "",
        "- Stores now resolve null instead of throwing ENOENT. (decision.fix-enoent)",
        "",
        "<!-- autoforge:changelog:end -->",
        "",
        "## [0.6.0] - 2026-08-16",
        "",
        "### Major Features",
        "",
        "- Old entry that must be preserved.",
        "",
      ].join("\n"),
    );
  });
});
