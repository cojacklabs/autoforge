import { z } from "zod";

export const SPECIFICATION_TYPES = [
  "architecture",
  "screen",
  "component",
  "flow",
  "design",
  "token",
  "state",
  "responsive",
] as const;

export const DESIGN_SPECIFICATION_TYPES = [
  "screen",
  "component",
  "token",
  "flow",
  "state",
  "responsive",
] as const;

const timestampSchema = z.string().datetime({ offset: true });
const canonicalTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9._/-]*$/, "Expected a canonical lowercase tag");

export const specificationTypeSchema = z.enum(SPECIFICATION_TYPES);
export const designSpecificationTypeSchema = z.enum(DESIGN_SPECIFICATION_TYPES);

export const specificationReferenceSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .regex(
    /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a namespaced specification reference",
  );

export const specificationIdSchema = specificationReferenceSchema.refine(
  (id) =>
    SPECIFICATION_TYPES.includes(
      id.slice(0, id.indexOf(".")) as (typeof SPECIFICATION_TYPES)[number],
    ),
  "Specification IDs must use a supported type prefix",
);

export const specificationRelationshipNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z][a-z0-9-]*$/,
    "Expected a canonical lowercase relationship name",
  );

export const specificationRelationshipsSchema = z
  .record(
    specificationRelationshipNameSchema,
    z.array(specificationReferenceSchema),
  )
  .superRefine((relationships, context) => {
    for (const [name, references] of Object.entries(relationships)) {
      if (new Set(references).size !== references.length) {
        context.addIssue({
          code: "custom",
          message: `Relationship ${name} references must be unique`,
          path: [name],
        });
      }
    }
  });

const designNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "Expected a canonical design name");

function uniqueValues(
  values: readonly string[],
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message, path });
  }
}

export const screenDesignMetadataSchema = z
  .object({
    kind: z.literal("screen"),
    route: z.string().trim().min(1).max(500).optional(),
    regions: z.array(designNameSchema).min(1).max(100),
    entryState: specificationReferenceSchema.optional(),
  })
  .strict()
  .superRefine((metadata, context) => {
    uniqueValues(
      metadata.regions,
      context,
      ["regions"],
      "Screen regions must be unique",
    );
  });

export const componentPropertySchema = z
  .object({
    name: designNameSchema,
    type: z.string().trim().min(1).max(200),
    required: z.boolean(),
    description: z.string().trim().min(1).max(1_000).optional(),
  })
  .strict();

export const componentDesignMetadataSchema = z
  .object({
    kind: z.literal("component"),
    variants: z.array(designNameSchema).max(100).default([]),
    properties: z.array(componentPropertySchema).max(200).default([]),
    slots: z.array(designNameSchema).max(100).default([]),
  })
  .strict()
  .superRefine((metadata, context) => {
    uniqueValues(
      metadata.variants,
      context,
      ["variants"],
      "Component variants must be unique",
    );
    uniqueValues(
      metadata.slots,
      context,
      ["slots"],
      "Component slots must be unique",
    );
    uniqueValues(
      metadata.properties.map(({ name }) => name),
      context,
      ["properties"],
      "Component property names must be unique",
    );
  });

export const tokenDesignMetadataSchema = z
  .object({
    kind: z.literal("token"),
    category: z.enum([
      "color",
      "typography",
      "spacing",
      "sizing",
      "radius",
      "shadow",
      "motion",
      "breakpoint",
      "other",
    ]),
    value: z.string().trim().min(1).max(2_000),
    modes: z
      .record(designNameSchema, z.string().trim().min(1).max(2_000))
      .default({}),
  })
  .strict();

export const flowStepSchema = z
  .object({
    id: designNameSchema,
    screen: specificationReferenceSchema
      .refine(
        (reference) => reference.startsWith("screen."),
        "Expected a screen reference",
      )
      .optional(),
    action: z.string().trim().min(1).max(1_000),
    next: designNameSchema.optional(),
  })
  .strict();

export const flowDesignMetadataSchema = z
  .object({
    kind: z.literal("flow"),
    steps: z.array(flowStepSchema).min(2).max(200),
  })
  .strict()
  .superRefine((metadata, context) => {
    const stepIds = metadata.steps.map(({ id }) => id);
    uniqueValues(stepIds, context, ["steps"], "Flow step IDs must be unique");
    const knownSteps = new Set(stepIds);
    for (const [index, step] of metadata.steps.entries()) {
      if (step.next !== undefined && !knownSteps.has(step.next)) {
        context.addIssue({
          code: "custom",
          message: `Flow step references unknown next step: ${step.next}`,
          path: ["steps", index, "next"],
        });
      }
    }
  });

const designSubjectSchema = specificationReferenceSchema.refine(
  (reference) =>
    reference.startsWith("screen.") || reference.startsWith("component."),
  "Expected a screen or component reference",
);

export const stateDesignMetadataSchema = z
  .object({
    kind: z.literal("state"),
    subject: designSubjectSchema,
    name: designNameSchema,
    conditions: z
      .array(z.string().trim().min(1).max(1_000))
      .max(100)
      .default([]),
    changes: z.array(z.string().trim().min(1).max(2_000)).min(1).max(200),
  })
  .strict();

export const responsiveRuleSchema = z
  .object({
    name: designNameSchema,
    minWidth: z.number().int().nonnegative(),
    maxWidth: z.number().int().nonnegative().optional(),
    behavior: z.string().trim().min(1).max(2_000),
  })
  .strict()
  .superRefine((rule, context) => {
    if (rule.maxWidth !== undefined && rule.maxWidth < rule.minWidth) {
      context.addIssue({
        code: "custom",
        message:
          "Responsive maxWidth must be greater than or equal to minWidth",
        path: ["maxWidth"],
      });
    }
  });

export const responsiveDesignMetadataSchema = z
  .object({
    kind: z.literal("responsive"),
    subject: designSubjectSchema,
    rules: z.array(responsiveRuleSchema).min(1).max(100),
  })
  .strict()
  .superRefine((metadata, context) => {
    uniqueValues(
      metadata.rules.map(({ name }) => name),
      context,
      ["rules"],
      "Responsive rule names must be unique",
    );
  });

export const designMetadataSchema = z.discriminatedUnion("kind", [
  screenDesignMetadataSchema,
  componentDesignMetadataSchema,
  tokenDesignMetadataSchema,
  flowDesignMetadataSchema,
  stateDesignMetadataSchema,
  responsiveDesignMetadataSchema,
]);

const specificationFrontmatterFields = {
  id: specificationIdSchema,
  type: specificationTypeSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2_000),
  relationships: specificationRelationshipsSchema,
  tags: z.array(canonicalTagSchema),
  source: z.string().trim().min(1).max(500),
  updatedAt: timestampSchema,
  design: designMetadataSchema.optional(),
};

export const specificationFrontmatterSchema = z
  .object(specificationFrontmatterFields)
  .strict();

export const specificationSchema = z
  .object({
    ...specificationFrontmatterFields,
    content: z.string().trim().min(1).max(100_000),
  })
  .strict()
  .superRefine((specification, context) => {
    if (!specification.id.startsWith(`${specification.type}.`)) {
      context.addIssue({
        code: "custom",
        message: "Specification ID prefix must match its type",
        path: ["id"],
      });
    }
    if (
      specification.design !== undefined &&
      specification.design.kind !== specification.type
    ) {
      context.addIssue({
        code: "custom",
        message: "Design metadata kind must match the specification type",
        path: ["design", "kind"],
      });
    }
    if (new Set(specification.tags).size !== specification.tags.length) {
      context.addIssue({
        code: "custom",
        message: "Specification tags must be unique",
        path: ["tags"],
      });
    }
    for (const [name, references] of Object.entries(
      specification.relationships,
    )) {
      if (references.includes(specification.id)) {
        context.addIssue({
          code: "custom",
          message: `Relationship ${name} cannot reference the specification itself`,
          path: ["relationships", name],
        });
      }
    }
  });

export const designSpecificationSchema = specificationSchema.superRefine(
  (specification, context) => {
    if (
      !DESIGN_SPECIFICATION_TYPES.includes(
        specification.type as (typeof DESIGN_SPECIFICATION_TYPES)[number],
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Expected a design specification type",
        path: ["type"],
      });
    }
    if (specification.design === undefined) {
      context.addIssue({
        code: "custom",
        message: "Design specifications require typed design metadata",
        path: ["design"],
      });
    }
  },
);

export const specificationRelationshipEdgeSchema = z
  .object({
    sourceId: specificationIdSchema,
    relationship: specificationRelationshipNameSchema,
    targetId: specificationReferenceSchema,
  })
  .strict();

export type SpecificationType = z.infer<typeof specificationTypeSchema>;
export type DesignSpecificationType = z.infer<
  typeof designSpecificationTypeSchema
>;
export type DesignMetadata = z.infer<typeof designMetadataSchema>;
export type SpecificationRelationships = z.infer<
  typeof specificationRelationshipsSchema
>;
export type Specification = z.infer<typeof specificationSchema>;
export type DesignSpecification = z.infer<typeof designSpecificationSchema>;
export type SpecificationRelationshipEdge = z.infer<
  typeof specificationRelationshipEdgeSchema
>;
