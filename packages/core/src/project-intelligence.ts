import { z } from "zod";

import {
  evaluateReadiness,
  readinessResultSchema,
  readinessWorkKindSchema,
  recommendWorkflow,
  triageIntent,
  triageIntentSchema,
  triageResultSchema,
  workflowRecommendationSchema,
} from "./intent.js";
import {
  generatePlanningArtifact,
  planningArtifactKindSchema,
  planningArtifactSchema,
  type PlanningArtifactKind,
} from "./planning.js";
import { systemClock, type Clock } from "./ports.js";

export const intentAssessmentInputSchema = z
  .object({
    intent: triageIntentSchema,
    workKind: readinessWorkKindSchema,
    artifacts: z.array(planningArtifactKindSchema).default([]),
  })
  .strict();
export const intentAssessmentSchema = z
  .object({
    triage: triageResultSchema,
    readiness: readinessResultSchema,
    artifacts: z.array(planningArtifactSchema),
    workflow: workflowRecommendationSchema,
  })
  .strict();
export type IntentAssessmentInput = z.infer<typeof intentAssessmentInputSchema>;
export type IntentAssessment = z.infer<typeof intentAssessmentSchema>;

export class ProjectIntelligenceService {
  constructor(private readonly clock: Clock = systemClock) {}

  assess(input: IntentAssessmentInput): IntentAssessment {
    const validated = intentAssessmentInputSchema.parse(input);
    const triage = triageIntent(validated.intent);
    const readiness = evaluateReadiness(validated.intent, validated.workKind);
    return intentAssessmentSchema.parse({
      triage,
      readiness,
      workflow: recommendWorkflow(triage.labels, readiness.level),
      artifacts: validated.artifacts.map((kind: PlanningArtifactKind) =>
        generatePlanningArtifact(validated.intent, kind, this.clock.now()),
      ),
    });
  }
}
