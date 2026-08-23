import { z } from "zod";

import { experimentIdSchema } from "./experiment-schemas.js";
import { hypothesisIdSchema } from "./hypothesis-schemas.js";

const timestampSchema = z.string().datetime({ offset: true });

export const evidenceIdSchema = z
  .string()
  .regex(
    /^evidence\.[a-z0-9][a-z0-9._-]*$/,
    "Expected an evidence ID such as evidence.beta-cohort-3-feedback",
  );

const relatedWorkIdSchema = z
  .string()
  .regex(
    /^(feature|phase|task|issue)\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a feature, phase, task, or issue ID",
  );

const decisionIdSchema = z
  .string()
  .regex(
    /^decision\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a decision ID such as decision.use-postgres",
  );

export const evidenceKindSchema = z.enum([
  "analytics",
  "beta-feedback",
  "support-ticket",
  "bug-report",
  "usability-study",
  "experiment-result",
  "performance-metric",
  "interview",
  "ai-evaluation",
]);

export const evidenceSchema = z
  .object({
    id: evidenceIdSchema,
    kind: evidenceKindSchema,
    summary: z.string().trim().min(1).max(4_000),
    source: z.string().trim().min(1).max(500),
    experimentId: experimentIdSchema.nullable(),
    hypothesisId: hypothesisIdSchema.nullable(),
    relatedWork: relatedWorkIdSchema.nullable(),
    resultingDecision: decisionIdSchema.nullable(),
    capturedAt: timestampSchema,
  })
  .strict()
  .superRefine((evidence, context) => {
    if (
      !evidence.experimentId &&
      !evidence.hypothesisId &&
      !evidence.relatedWork
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Evidence must reference at least one of experimentId, hypothesisId, or relatedWork",
        path: ["experimentId"],
      });
    }
  });

export const evidenceMemorySchema = z
  .object({
    evidence: z.array(evidenceSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, record] of memory.evidence.entries()) {
      if (seen.has(record.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate evidence ID: ${record.id}`,
          path: ["evidence", index, "id"],
        });
      }
      seen.add(record.id);
    }
  });

export type EvidenceKind = z.infer<typeof evidenceKindSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type EvidenceMemory = z.infer<typeof evidenceMemorySchema>;
