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
import type {
  AssignmentInput,
  CheckInput,
  CompleteWorkInput,
  ContextInput,
  DecisionInput,
  HandoffInput,
  ProjectsInput,
  StartWorkInput,
  SupportedAutoForgeOperations,
  ValidationInput,
  WorkInput,
} from "./operations.js";
import { SDK_OPERATION_CAPABILITIES } from "./operations.js";

export * from "./operations.js";

export interface SdkResponse<T> {
  protocolVersion: ProtocolVersion;
  data: T;
}

export interface SdkCapabilities {
  protocolVersion: ProtocolVersion;
  operations: typeof SDK_OPERATION_CAPABILITIES;
}

export function getSdkCapabilities(): SdkResponse<SdkCapabilities> {
  return response({
    protocolVersion: AUTOFORGE_PROTOCOL_VERSION,
    operations: SDK_OPERATION_CAPABILITIES,
  });
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

export interface AttachmentInspection {
  requestedPath: string;
  resolvedRoot: string;
  repositoryKind: "git" | "worktree" | "submodule" | "non-git";
  installationStatus: "absent" | "current" | "legacy" | "partial";
  registrationStatus: "registered" | "unregistered";
  actions: Array<"initialize" | "register">;
  conflicts: string[];
}

export type AttachmentInspector = () => Promise<AttachmentInspection>;

export async function inspectProjectAttachment(
  inspector: AttachmentInspector,
): Promise<SdkResponse<AttachmentInspection>> {
  return response(await inspector());
}

export interface AutoForgeSdkOptions<
  Projects,
  Status,
  Work,
  Context,
  Check,
  Assignment,
  Decision,
  Validation,
  Handoff,
  Start,
  Complete,
> {
  operations: SupportedAutoForgeOperations<
    Projects,
    Status,
    Work,
    Context,
    Check,
    Assignment,
    Decision,
    Validation,
    Handoff,
    Start,
    Complete
  >;
  clock?: Clock;
}

export class AutoForgeSdk<
  Projects,
  Status,
  Work,
  Context,
  Check,
  Assignment,
  Decision,
  Validation,
  Handoff,
  Start,
  Complete,
> {
  private readonly intelligence: ProjectIntelligenceService;
  private readonly operations: SupportedAutoForgeOperations<
    Projects,
    Status,
    Work,
    Context,
    Check,
    Assignment,
    Decision,
    Validation,
    Handoff,
    Start,
    Complete
  >;

  constructor(
    options: AutoForgeSdkOptions<
      Projects,
      Status,
      Work,
      Context,
      Check,
      Assignment,
      Decision,
      Validation,
      Handoff,
      Start,
      Complete
    >,
  ) {
    this.operations = options.operations;
    this.intelligence = new ProjectIntelligenceService(options.clock);
  }

  assessIntent(input: IntentAssessmentInput): SdkResponse<IntentAssessment> {
    return response(this.intelligence.assess(input));
  }

  async projects(input: ProjectsInput): Promise<SdkResponse<Projects>> {
    return response(await this.operations.projects(input));
  }

  async status(): Promise<SdkResponse<Status>> {
    return response(await this.operations.status());
  }

  async work(input: WorkInput): Promise<SdkResponse<Work>> {
    return response(await this.operations.work(input));
  }

  async context(input: ContextInput = {}): Promise<SdkResponse<Context>> {
    return response(await this.operations.context(input));
  }

  async check(input: CheckInput = {}): Promise<SdkResponse<Check>> {
    return response(await this.operations.check(input));
  }

  async assignments(input: AssignmentInput): Promise<SdkResponse<Assignment>> {
    return response(await this.operations.assignments(input));
  }

  async decisions(input: DecisionInput): Promise<SdkResponse<Decision>> {
    return response(await this.operations.decisions(input));
  }

  async validation(
    input: ValidationInput = {},
  ): Promise<SdkResponse<Validation>> {
    return response(await this.operations.validation(input));
  }

  async handoffs(input: HandoffInput): Promise<SdkResponse<Handoff>> {
    return response(await this.operations.handoffs(input));
  }

  async startWork(input: StartWorkInput): Promise<SdkResponse<Start>> {
    return response(await this.operations.startWork(input));
  }

  async completeWork(
    input: CompleteWorkInput = {},
  ): Promise<SdkResponse<Complete>> {
    return response(await this.operations.completeWork(input));
  }
}

export function assessIntent(
  input: IntentAssessmentInput,
  clock?: Clock,
): SdkResponse<IntentAssessment> {
  return response(new ProjectIntelligenceService(clock).assess(input));
}

export function createAutoForgeSdk<
  Projects,
  Status,
  Work,
  Context,
  Check,
  Assignment,
  Decision,
  Validation,
  Handoff,
  Start,
  Complete,
>(options: {
  operations: SupportedAutoForgeOperations<
    Projects,
    Status,
    Work,
    Context,
    Check,
    Assignment,
    Decision,
    Validation,
    Handoff,
    Start,
    Complete
  >;
  clock?: Clock;
}): AutoForgeSdk<
  Projects,
  Status,
  Work,
  Context,
  Check,
  Assignment,
  Decision,
  Validation,
  Handoff,
  Start,
  Complete
> {
  return new AutoForgeSdk<
    Projects,
    Status,
    Work,
    Context,
    Check,
    Assignment,
    Decision,
    Validation,
    Handoff,
    Start,
    Complete
  >(options);
}

function response<T>(data: T): SdkResponse<T> {
  return { protocolVersion: AUTOFORGE_PROTOCOL_VERSION, data };
}

export type { IntentAssessment, IntentAssessmentInput };
