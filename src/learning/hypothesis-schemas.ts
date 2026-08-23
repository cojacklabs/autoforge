import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });

export const hypothesisIdSchema = z
  .string()
  .regex(
    /^hypothesis\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a hypothesis ID such as hypothesis.faster-onboarding",
  );

const relatedWorkIdSchema = z
  .string()
  .regex(
    /^(feature|phase|task|issue)\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a feature, phase, task, or issue ID",
  );

export const hypothesisStatusSchema = z.enum([
  "proposed",
  "testing",
  "confirmed",
  "refuted",
]);

export const hypothesisSchema = z
  .object({
    id: hypothesisIdSchema,
    statement: z.string().trim().min(1).max(2_000),
    expectedOutcome: z.string().trim().min(1).max(2_000),
    metric: z.string().trim().min(1).max(200),
    target: z.string().trim().min(1).max(200),
    linkedFeature: relatedWorkIdSchema.nullable(),
    status: hypothesisStatusSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((hypothesis, context) => {
    if (Date.parse(hypothesis.updatedAt) < Date.parse(hypothesis.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "A hypothesis cannot be updated before it is created",
        path: ["updatedAt"],
      });
    }
  });

export const hypothesisMemorySchema = z
  .object({
    hypotheses: z.array(hypothesisSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, hypothesis] of memory.hypotheses.entries()) {
      if (seen.has(hypothesis.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate hypothesis ID: ${hypothesis.id}`,
          path: ["hypotheses", index, "id"],
        });
      }
      seen.add(hypothesis.id);
    }
  });

export type HypothesisStatus = z.infer<typeof hypothesisStatusSchema>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
export type HypothesisMemory = z.infer<typeof hypothesisMemorySchema>;
