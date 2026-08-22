import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
const identifierSchema = z.string().trim().min(1).max(500);

export const twinNodeTypeSchema = z.enum([
  "vision",
  "constitution",
  "release",
  "domain",
  "feature",
  "story",
  "flow",
  "screen",
  "component",
  "api",
  "architecture",
  "permission",
  "test",
  "decision",
  "risk",
  "evidence",
  "work",
]);

export const twinNodeSchema = z
  .object({
    id: identifierSchema,
    type: twinNodeTypeSchema,
    title: z.string().trim().min(1).max(500),
    source: z.string().trim().min(1).max(500),
    updatedAt: timestampSchema,
  })
  .strict();

export const twinEdgeSchema = z
  .object({
    sourceId: identifierSchema,
    targetId: identifierSchema,
    relationship: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z][a-z0-9-]*$/),
  })
  .strict()
  .superRefine((edge, context) => {
    if (edge.sourceId === edge.targetId) {
      context.addIssue({
        code: "custom",
        message: "Twin edges cannot reference the same node",
        path: ["targetId"],
      });
    }
  });

export const twinProjectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectId: identifierSchema,
    generatedAt: timestampSchema,
    nodes: z.array(twinNodeSchema),
    edges: z.array(twinEdgeSchema),
  })
  .strict();

export const twinQuerySchema = z
  .object({
    nodeTypes: z.array(twinNodeTypeSchema).optional(),
    relationship: z.string().trim().min(1).max(80).optional(),
    maxDepth: z.number().int().min(0).max(20).default(1),
    limit: z.number().int().min(1).max(500).default(100),
  })
  .strict();

export type TwinNodeType = z.infer<typeof twinNodeTypeSchema>;
export type TwinNode = z.infer<typeof twinNodeSchema>;
export type TwinEdge = z.infer<typeof twinEdgeSchema>;
export type TwinProjection = z.infer<typeof twinProjectionSchema>;
export type TwinQuery = z.infer<typeof twinQuerySchema>;
