import { z } from "zod";

import { hypothesisIdSchema } from "./hypothesis-schemas.js";

const timestampSchema = z.string().datetime({ offset: true });

export const experimentIdSchema = z
  .string()
  .regex(
    /^experiment\.[a-z0-9][a-z0-9._-]*$/,
    "Expected an experiment ID such as experiment.onboarding-ab-test",
  );

export const experimentStatusSchema = z.enum([
  "planned",
  "running",
  "completed",
  "abandoned",
]);

export const experimentSchema = z
  .object({
    id: experimentIdSchema,
    hypothesisIds: z.array(hypothesisIdSchema).min(1),
    method: z.string().trim().min(1).max(500),
    status: experimentStatusSchema,
    startedAt: timestampSchema,
    endedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((experiment, context) => {
    if (
      new Set(experiment.hypothesisIds).size !== experiment.hypothesisIds.length
    ) {
      context.addIssue({
        code: "custom",
        message: "hypothesisIds values must be unique",
        path: ["hypothesisIds"],
      });
    }
    if (Date.parse(experiment.updatedAt) < Date.parse(experiment.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "An experiment cannot be updated before it is created",
        path: ["updatedAt"],
      });
    }
    if (
      experiment.endedAt &&
      Date.parse(experiment.endedAt) < Date.parse(experiment.startedAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "An experiment cannot end before it starts",
        path: ["endedAt"],
      });
    }
  });

export const experimentMemorySchema = z
  .object({
    experiments: z.array(experimentSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, experiment] of memory.experiments.entries()) {
      if (seen.has(experiment.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate experiment ID: ${experiment.id}`,
          path: ["experiments", index, "id"],
        });
      }
      seen.add(experiment.id);
    }
  });

export type ExperimentStatus = z.infer<typeof experimentStatusSchema>;
export type Experiment = z.infer<typeof experimentSchema>;
export type ExperimentMemory = z.infer<typeof experimentMemorySchema>;
