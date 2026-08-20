import { describe, expect, it } from "vitest";

import {
  parseSpecificationMarkdown,
  serializeSpecificationMarkdown,
} from "../src/specifications/codec.js";
import type { Specification } from "../src/specifications/schemas.js";

const specification: Specification = {
  id: "component.job-card",
  type: "component",
  name: "Job Card",
  description: "Displays a summarized job.",
  relationships: {
    uses: ["design.spacing", "architecture.jobs"],
  },
  tags: ["frontend", "jobs"],
  source: "docs/components/job-card.md",
  updatedAt: "2026-08-20T12:00:00.000Z",
  content: "# Job Card\n\nRender the job summary.",
};

describe("specification Markdown codec", () => {
  it("round trips structured metadata and human-readable Markdown", () => {
    const markdown = serializeSpecificationMarkdown(specification);

    expect(markdown).toContain("id: component.job-card");
    expect(markdown).toContain("uses:");
    expect(markdown).toContain("# Job Card");
    expect(parseSpecificationMarkdown(markdown)).toEqual(specification);
  });

  it("accepts CRLF frontmatter and normalizes trailing body whitespace", () => {
    const markdown = serializeSpecificationMarkdown(specification).replaceAll(
      "\n",
      "\r\n",
    );

    expect(parseSpecificationMarkdown(markdown).content).toBe(
      "# Job Card\r\n\r\nRender the job summary.",
    );
  });

  it("rejects missing frontmatter, malformed YAML, and invalid metadata", () => {
    expect(() => parseSpecificationMarkdown("# No metadata\n")).toThrowError(
      /requires YAML frontmatter/,
    );
    expect(() =>
      parseSpecificationMarkdown("---\nid: [broken\n---\n# Body\n"),
    ).toThrowError(/invalid YAML/);
    expect(() =>
      parseSpecificationMarkdown(
        "---\nid: component.bad\ntype: component\n---\n# Body\n",
      ),
    ).toThrowError(/is invalid/);
  });
});
