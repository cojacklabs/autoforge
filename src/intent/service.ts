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
    return intentAssessmentSchema.parse({
      triage: triageIntent(validated.intent),
      readiness: evaluateReadiness(validated.intent, validated.workKind),
      artifacts: validated.artifacts.map((kind: PlanningArtifactKind) =>
        generatePlanningArtifact(validated.intent, kind, this.now()),
      ),
    });
  }
}
