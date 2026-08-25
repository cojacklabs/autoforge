import {
  ProjectIntelligenceService,
  type Clock,
  type IntentAssessment,
  type IntentAssessmentInput,
} from "@cojacklabs/autoforge-core";
import {
  AUTOFORGE_PROTOCOL_VERSION,
  type ProtocolVersion,
} from "@cojacklabs/autoforge-protocol";

export interface SdkResponse<T> {
  protocolVersion: ProtocolVersion;
  data: T;
}

export type StartableWorkKind = "task" | "issue";

export interface StartWorkInput {
  kind: StartableWorkKind;
  id: string;
}

export interface AutoForgeProjectOperations<
  ProjectStatus,
  StartResult,
  CompleteResult,
> {
  status(): Promise<ProjectStatus>;
  startWork(input: StartWorkInput): Promise<StartResult>;
  completeWork(): Promise<CompleteResult>;
}

export interface AutoForgeSdkOptions<
  ProjectStatus,
  StartResult,
  CompleteResult,
> {
  operations: AutoForgeProjectOperations<
    ProjectStatus,
    StartResult,
    CompleteResult
  >;
  clock?: Clock;
}

export class AutoForgeSdk<ProjectStatus, StartResult, CompleteResult> {
  private readonly intelligence: ProjectIntelligenceService;
  private readonly operations: AutoForgeProjectOperations<
    ProjectStatus,
    StartResult,
    CompleteResult
  >;

  constructor(
    options: AutoForgeSdkOptions<ProjectStatus, StartResult, CompleteResult>,
  ) {
    this.operations = options.operations;
    this.intelligence = new ProjectIntelligenceService(options.clock);
  }

  assessIntent(input: IntentAssessmentInput): SdkResponse<IntentAssessment> {
    return response(this.intelligence.assess(input));
  }

  async status(): Promise<SdkResponse<ProjectStatus>> {
    return response(await this.operations.status());
  }

  async startWork(input: StartWorkInput): Promise<SdkResponse<StartResult>> {
    return response(await this.operations.startWork(input));
  }

  async completeWork(): Promise<SdkResponse<CompleteResult>> {
    return response(await this.operations.completeWork());
  }
}

export function createAutoForgeSdk<ProjectStatus, StartResult, CompleteResult>(
  options: AutoForgeSdkOptions<ProjectStatus, StartResult, CompleteResult>,
): AutoForgeSdk<ProjectStatus, StartResult, CompleteResult> {
  return new AutoForgeSdk(options);
}

function response<T>(data: T): SdkResponse<T> {
  return { protocolVersion: AUTOFORGE_PROTOCOL_VERSION, data };
}

export type { IntentAssessment, IntentAssessmentInput };
