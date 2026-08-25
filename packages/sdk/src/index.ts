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

export interface ProjectStatus {
  project: { name: string; root: string };
  work: {
    state: "idle" | "active";
    active: {
      kind: "task" | "issue";
      id: string;
      name: string;
      sessionId: string;
      startedAt: string;
    } | null;
    counts: {
      planned: number;
      ready: number;
      active: number;
      blocked: number;
      completed: number;
      canceled: number;
    };
  };
  nextCommands: string[];
}

export type ProjectStatusReader = () => Promise<ProjectStatus>;

export async function readProjectStatus(
  reader: ProjectStatusReader,
): Promise<SdkResponse<ProjectStatus>> {
  return response(await reader());
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

export function assessIntent(
  input: IntentAssessmentInput,
  clock?: Clock,
): SdkResponse<IntentAssessment> {
  return response(new ProjectIntelligenceService(clock).assess(input));
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
