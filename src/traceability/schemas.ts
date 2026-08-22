import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
const artifactIdSchema = z.string().trim().min(1).max(500);
const relationshipSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z][a-z0-9-]*$/);

export const traceLinkSchema = z
  .object({
    id: z.string().regex(/^trace\.[a-z0-9][a-z0-9._-]*$/),
    sourceId: artifactIdSchema,
    targetId: artifactIdSchema,
    relationship: relationshipSchema,
    provenance: z.string().trim().min(1).max(500),
    capturedAt: timestampSchema,
  })
  .strict()
  .superRefine((link, context) => {
    if (link.sourceId === link.targetId) {
      context.addIssue({
        code: "custom",
        message: "Trace links cannot reference the same artifact",
        path: ["targetId"],
      });
    }
  });

export const traceGraphSchema = z
  .object({
    schemaVersion: z.literal(1),
    links: z.array(traceLinkSchema),
  })
  .strict();

export type TraceLink = z.infer<typeof traceLinkSchema>;
export type TraceGraph = z.infer<typeof traceGraphSchema>;
