import { z } from "zod";

import {
  evaluateReadiness,
  readinessResultSchema,
  readinessWorkKindSchema,
} from "./readiness.js";
import {
  triageIntent,
  triageResultSchema,
  triageIntentSchema,
} from "./triage.js";
import {
  generatePlanningArtifact,
  planningArtifactKindSchema,
  planningArtifactSchema,
  type PlanningArtifactKind,
} from "../planning/artifacts.js";
import { recommendWorkflow, workflowRecommendationSchema } from "./workflow.js";

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

export interface IntentApplicationServiceOptions {
  now?: () => Date;
}

export class IntentApplicationService {
  private readonly now: () => Date;

  constructor(options: IntentApplicationServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  assess(input: IntentAssessmentInput): IntentAssessment {
    const validated = intentAssessmentInputSchema.parse(input);
    const triage = triageIntent(validated.intent);
    const readiness = evaluateReadiness(validated.intent, validated.workKind);
    return intentAssessmentSchema.parse({
      triage,
      readiness,
      workflow: recommendWorkflow(triage.labels, readiness.level),
      artifacts: validated.artifacts.map((kind: PlanningArtifactKind) =>
        generatePlanningArtifact(validated.intent, kind, this.now()),
      ),
    });
  }
}
