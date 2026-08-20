import { describe, expect, it } from "vitest";

import {
  parseDesignSpecificationMarkdown,
  parseSpecificationMarkdown,
  serializeSpecificationMarkdown,
} from "../src/specifications/codec.js";
import {
  DESIGN_SPECIFICATION_TYPES,
  designSpecificationSchema,
  specificationSchema,
  type DesignMetadata,
  type DesignSpecificationType,
} from "../src/specifications/schemas.js";

const TIMESTAMP = "2026-08-20T18:00:00.000Z";

function designSpecification(
  type: DesignSpecificationType,
  design: DesignMetadata,
) {
  return {
    id: `${type}.example`,
    type,
    name: `${type} example`,
    description: `Typed ${type} design context.`,
    relationships: {},
    tags: ["design", type],
    source: "manual:test",
    updatedAt: TIMESTAMP,
    design,
    content: `# ${type} example\n\nImplementation guidance.`,
  };
}

const examples: Record<DesignSpecificationType, DesignMetadata> = {
  screen: {
    kind: "screen",
    route: "/jobs",
    regions: ["header", "job-list"],
    entryState: "state.jobs-loading",
  },
  component: {
    kind: "component",
    variants: ["default", "compact"],
    slots: ["actions"],
    properties: [
      { name: "title", type: "string", required: true },
      { name: "status", type: "JobStatus", required: false },
    ],
  },
  token: {
    kind: "token",
    category: "spacing",
    value: "1rem",
    modes: { compact: "0.75rem" },
  },
  flow: {
    kind: "flow",
    steps: [
      {
        id: "open",
        screen: "screen.jobs",
        action: "Open a job",
        next: "review",
      },
      { id: "review", screen: "screen.job-detail", action: "Review details" },
    ],
  },
  state: {
    kind: "state",
    subject: "screen.jobs",
    name: "loading",
    conditions: ["Jobs request is pending"],
    changes: ["Show skeleton rows", "Disable pagination"],
  },
  responsive: {
    kind: "responsive",
    subject: "screen.jobs",
    rules: [
      {
        name: "mobile",
        minWidth: 0,
        maxWidth: 767,
        behavior: "Use one column",
      },
      { name: "desktop", minWidth: 768, behavior: "Use two columns" },
    ],
  },
};

describe("design specification schemas", () => {
  it("supports all six typed design categories", () => {
    expect(DESIGN_SPECIFICATION_TYPES).toEqual([
      "screen",
      "component",
      "token",
      "flow",
      "state",
      "responsive",
    ]);
    for (const type of DESIGN_SPECIFICATION_TYPES) {
      expect(
        designSpecificationSchema.parse(
          designSpecification(type, examples[type]),
        ),
      ).toMatchObject({ type, design: { kind: type } });
    }
  });

  it("keeps generic specifications compatible while requiring metadata for typed imports", () => {
    const genericScreen = {
      ...designSpecification("screen", examples.screen),
      design: undefined,
    };

    expect(specificationSchema.safeParse(genericScreen).success).toBe(true);
    expect(designSpecificationSchema.safeParse(genericScreen).success).toBe(
      false,
    );
    expect(
      specificationSchema.safeParse({
        ...designSpecification("screen", examples.component),
      }).success,
    ).toBe(false);
  });

  it("rejects invalid flow, component, and responsive contracts", () => {
    expect(
      designSpecificationSchema.safeParse(
        designSpecification("flow", {
          kind: "flow",
          steps: [
            { id: "start", action: "Start", next: "missing" },
            { id: "finish", action: "Finish" },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      designSpecificationSchema.safeParse(
        designSpecification("component", {
          kind: "component",
          variants: [],
          slots: [],
          properties: [
            { name: "label", type: "string", required: true },
            { name: "label", type: "number", required: false },
          ],
        }),
      ).success,
    ).toBe(false);
    expect(
      designSpecificationSchema.safeParse(
        designSpecification("responsive", {
          kind: "responsive",
          subject: "component.card",
          rules: [
            {
              name: "broken",
              minWidth: 900,
              maxWidth: 500,
              behavior: "Invalid",
            },
          ],
        }),
      ).success,
    ).toBe(false);
  });
});

describe("design specification Markdown codec", () => {
  it("round trips typed metadata through standard specification Markdown", () => {
    const specification = designSpecificationSchema.parse(
      designSpecification("token", examples.token),
    );
    const markdown = serializeSpecificationMarkdown(specification);

    expect(markdown).toContain("kind: token");
    expect(markdown).toContain("compact: 0.75rem");
    expect(parseDesignSpecificationMarkdown(markdown)).toEqual(specification);
    expect(parseSpecificationMarkdown(markdown)).toEqual(specification);
  });

  it("rejects generic design-type Markdown without a typed contract", () => {
    const generic = specificationSchema.parse({
      ...designSpecification("screen", examples.screen),
      design: undefined,
    });

    expect(() =>
      parseDesignSpecificationMarkdown(serializeSpecificationMarkdown(generic)),
    ).toThrowError(/Design specification/);
  });
});
