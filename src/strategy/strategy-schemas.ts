import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });

export const strategyIdSchema = z
  .string()
  .regex(
    /^strategy\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a strategy ID such as strategy.recruiter-messaging",
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

const evidenceIdSchema = z
  .string()
  .regex(
    /^evidence\.[a-z0-9][a-z0-9._-]*$/,
    "Expected an evidence ID such as evidence.beta-cohort-3-feedback",
  );

export const strategyFactorLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "uncertain",
]);

export const strategyDecisionSchema = z.enum([
  "now",
  "next",
  "later",
  "backlog",
]);

export const strategyFactorsSchema = z
  .object({
    alignment: strategyFactorLevelSchema,
    value: strategyFactorLevelSchema,
    risk: strategyFactorLevelSchema,
    cost: strategyFactorLevelSchema,
    evidenceStrength: strategyFactorLevelSchema,
    dependencyPressure: strategyFactorLevelSchema,
    complexity: strategyFactorLevelSchema,
    releaseConstraint: strategyFactorLevelSchema,
  })
  .strict();

export const strategyAssessmentSchema = z
  .object({
    id: strategyIdSchema,
    workId: relatedWorkIdSchema,
    factors: strategyFactorsSchema,
    decision: strategyDecisionSchema,
    rationale: z.string().trim().min(1).max(4_000),
    evidenceIds: z.array(evidenceIdSchema),
    resultingDecision: decisionIdSchema.nullable(),
    supersedes: strategyIdSchema.nullable(),
    status: z.enum(["active", "superseded"]),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const strategyMemorySchema = z
  .object({
    assessments: z.array(strategyAssessmentSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const seen = new Set<string>();
    for (const [index, assessment] of memory.assessments.entries()) {
      if (seen.has(assessment.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate strategy assessment ID: ${assessment.id}`,
          path: ["assessments", index, "id"],
        });
      }
      seen.add(assessment.id);
    }
  });

export type StrategyFactorLevel = z.infer<typeof strategyFactorLevelSchema>;
export type StrategyDecision = z.infer<typeof strategyDecisionSchema>;
export type StrategyFactors = z.infer<typeof strategyFactorsSchema>;
export type StrategyAssessment = z.infer<typeof strategyAssessmentSchema>;
export type StrategyMemory = z.infer<typeof strategyMemorySchema>;
