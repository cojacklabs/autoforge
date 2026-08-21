import { z } from "zod";

export const governanceNormativeLevelSchema = z.enum([
  "MUST",
  "MUST_NOT",
  "SHOULD",
  "SHOULD_NOT",
  "MAY",
]);

export const governanceEnforcementSchema = z.enum([
  "advisory",
  "managed",
  "hard",
]);

export const governanceScopeSchema = z.object({
  paths: z.array(z.string().trim().min(1)).default([]),
  workKinds: z.array(z.string().trim().min(1)).default([]),
  releases: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export const governanceRuleSchema = z
  .object({
    id: z.string().regex(/^constitution\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    title: z.string().trim().min(1),
    statement: z.string().trim().min(1),
    level: governanceNormativeLevelSchema,
    enforcement: governanceEnforcementSchema,
    scope: governanceScopeSchema,
    rationale: z.string().trim().min(1),
    nonGoals: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const constitutionArtifactSchema = z
  .object({
    id: z.string().regex(/^constitution\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    name: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
    rules: z.array(governanceRuleSchema).min(1),
    source: z.string().trim().min(1),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const governanceEvaluationStatusSchema = z.enum([
  "pass",
  "warning",
  "conflict",
  "blocked",
  "not-applicable",
]);

export const governanceEvaluationSchema = z
  .object({
    status: governanceEvaluationStatusSchema,
    ruleId: z.string().min(1),
    reason: z.string().trim().min(1),
  })
  .strict();

export const governanceConflictSchema = z
  .object({
    ruleId: z.string().min(1),
    severity: governanceEnforcementSchema,
    explanation: z.string().trim().min(1),
  })
  .strict();

export type GovernanceNormativeLevel = z.infer<
  typeof governanceNormativeLevelSchema
>;
export type GovernanceEnforcement = z.infer<typeof governanceEnforcementSchema>;
export type GovernanceScope = z.infer<typeof governanceScopeSchema>;
export type GovernanceRule = z.infer<typeof governanceRuleSchema>;
export type ConstitutionArtifact = z.infer<typeof constitutionArtifactSchema>;
export type GovernanceEvaluation = z.infer<typeof governanceEvaluationSchema>;
export type GovernanceConflict = z.infer<typeof governanceConflictSchema>;
