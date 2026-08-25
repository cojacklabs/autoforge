import {
  ProjectIntelligenceService,
  intentAssessmentInputSchema,
  intentAssessmentSchema,
  type IntentAssessment,
  type IntentAssessmentInput,
} from "@cojacklabs/autoforge-core";

export {
  intentAssessmentInputSchema,
  intentAssessmentSchema,
  type IntentAssessment,
  type IntentAssessmentInput,
};

export interface IntentApplicationServiceOptions {
  now?: () => Date;
}

export class IntentApplicationService extends ProjectIntelligenceService {
  constructor(options: IntentApplicationServiceOptions = {}) {
    super(options.now ? { now: options.now } : undefined);
  }
}
