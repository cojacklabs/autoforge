import { z } from "zod";

const domainIdSchema = z
  .string()
  .regex(/^domain\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

const domainLifecycleSchema = z.enum([
  "provisional",
  "confirmed",
  "deprecated",
]);

export const domainProvenanceSchema = z
  .object({
    sourceType: z.enum([
      "intent",
      "decision",
      "specification",
      "file",
      "human",
    ]),
    sourceId: z.string().trim().min(1),
    capturedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const domainConceptSchema = z
  .object({
    id: domainIdSchema,
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    aliases: z.array(z.string().trim().min(1)).default([]),
    lifecycle: domainLifecycleSchema,
    provenance: z.array(domainProvenanceSchema).default([]),
    metadata: z.record(z.string(), z.string()).default({}),
  })
  .strict();

export const domainRelationshipSchema = z
  .object({
    id: z.string().regex(/^domain-relation\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    sourceId: domainIdSchema,
    targetId: domainIdSchema,
    type: z.string().trim().min(1),
    cardinality: z
      .enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"])
      .optional(),
    rationale: z.string().trim().min(1),
    lifecycle: domainLifecycleSchema,
    provenance: z.array(domainProvenanceSchema).default([]),
  })
  .strict()
  .refine((relationship) => relationship.sourceId !== relationship.targetId, {
    message: "Domain relationships cannot reference the same concept",
    path: ["targetId"],
  });

export const domainInvariantSchema = z
  .object({
    id: z.string().regex(/^domain-invariant\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    statement: z.string().trim().min(1),
    scope: z.array(domainIdSchema).min(1),
    severity: z.enum(["advisory", "warning", "critical"]),
    evidence: z.array(z.string().trim().min(1)).default([]),
    lifecycle: domainLifecycleSchema,
    provenance: z.array(domainProvenanceSchema).default([]),
  })
  .strict();

export type DomainProvenance = z.infer<typeof domainProvenanceSchema>;
export type DomainConcept = z.infer<typeof domainConceptSchema>;
export type DomainRelationship = z.infer<typeof domainRelationshipSchema>;
export type DomainInvariant = z.infer<typeof domainInvariantSchema>;
