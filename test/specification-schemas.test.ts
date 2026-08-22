import { describe, expect, it } from "vitest";

import {
  specificationRelationshipEdgeSchema,
  specificationSchema,
} from "../src/specifications/schemas.js";

const TIMESTAMP = "2026-08-20T12:00:00.000Z";

function specification(overrides: Record<string, unknown> = {}) {
  return {
    id: "component.job-card",
    type: "component",
    name: "Job Card",
    description: "Displays a summarized job.",
    relationships: {
      uses: ["design.spacing", "architecture.jobs"],
    },
    tags: ["frontend", "jobs"],
    source: "docs/components/job-card.md",
    updatedAt: TIMESTAMP,
    content: "# Job Card\n\nRender the job summary.",
    ...overrides,
  };
}

describe("specification schemas", () => {
  it("accepts supported typed specifications", () => {
    expect(specificationSchema.parse(specification())).toMatchObject({
      id: "component.job-card",
      type: "component",
      relationships: { uses: ["design.spacing", "architecture.jobs"] },
    });
  });

  it("accepts validated provenance for freshness tracking", () => {
    expect(
      specificationSchema.parse(
        specification({
          provenance: {
            sourceKind: "import",
            sourcePath: "designs/job-card.md",
            sourceHash: "a".repeat(64),
            capturedAt: TIMESTAMP,
          },
        }),
      ).provenance,
    ).toMatchObject({ sourceKind: "import", sourceHash: "a".repeat(64) });
  });

  it("requires IDs to match a supported type", () => {
    expect(
      specificationSchema.safeParse(
        specification({ id: "screen.job-card", type: "component" }),
      ).success,
    ).toBe(false);
    expect(
      specificationSchema.safeParse(
        specification({ id: "unknown.job-card", type: "unknown" }),
      ).success,
    ).toBe(false);
  });

  it("rejects duplicate tags, relationship targets, and self references", () => {
    expect(
      specificationSchema.safeParse(
        specification({ tags: ["frontend", "frontend"] }),
      ).success,
    ).toBe(false);
    expect(
      specificationSchema.safeParse(
        specification({
          relationships: { uses: ["design.spacing", "design.spacing"] },
        }),
      ).success,
    ).toBe(false);
    expect(
      specificationSchema.safeParse(
        specification({ relationships: { contains: ["component.job-card"] } }),
      ).success,
    ).toBe(false);
  });

  it("validates normalized relationship edges", () => {
    expect(
      specificationRelationshipEdgeSchema.parse({
        sourceId: "component.job-card",
        relationship: "uses",
        targetId: "design.spacing",
      }),
    ).toEqual({
      sourceId: "component.job-card",
      relationship: "uses",
      targetId: "design.spacing",
    });
  });

  it("accepts intent knowledge metadata with progressive fields", () => {
    expect(
      specificationSchema.parse(
        specification({
          id: "intent.checkout",
          type: "intent",
          knowledge: {
            kind: "intent",
            raw: "I need a checkout flow.",
            requirements: ["Support card payments"],
            unknowns: ["Which provider?"],
          },
        }),
      ).knowledge,
    ).toMatchObject({ kind: "intent", raw: "I need a checkout flow." });
  });

  it("requires research provenance and findings", () => {
    expect(
      specificationSchema.safeParse(
        specification({
          id: "research.checkout",
          type: "research",
          knowledge: {
            kind: "research",
            question: "Which provider fits?",
            sources: [
              {
                type: "human",
                capturedAt: TIMESTAMP,
              },
            ],
            findings: ["Provider A supports the required region."],
          },
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects knowledge metadata whose kind disagrees with the type", () => {
    expect(
      specificationSchema.safeParse(
        specification({
          id: "intent.checkout",
          type: "intent",
          knowledge: {
            kind: "research",
            question: "x",
            sources: [],
            findings: [],
          },
        }),
      ).success,
    ).toBe(false);
  });
});
