import type { CreateAgentHandoffInput } from "@cojacklabs/autoforge-protocol";

export type ProtocolPrimitive = string | number | boolean | null;

export type ProtocolData =
  | ProtocolPrimitive
  | { readonly [key: string]: ProtocolData | undefined }
  | readonly ProtocolData[];

export type SdkOperation<Input, Output> = (input: Input) => Promise<Output>;

export type SdkQuery<Output> = () => Promise<Output>;

export interface ProjectsInput {
  action:
    | "list"
    | "show"
    | "attach"
    | "detach"
    | "update"
    | "relocate"
    | "archive"
    | "restore";
  project?: string;
  path?: string;
  destinationPath?: string;
  dryRun?: boolean;
}

export interface WorkInput {
  action: "list" | "show" | "create";
  kind?: "feature" | "phase" | "task" | "issue";
  id?: string;
  parentId?: string;
  name?: string;
  description?: string;
  include?: string[];
  exclude?: string[];
  status?:
    "planned" | "ready" | "active" | "blocked" | "completed" | "canceled";
}

export interface ContextInput {
  workId?: string;
  explain?: boolean;
}

export interface CheckInput {
  path?: string;
  agentId?: string;
  refresh?: boolean;
}

export interface AssignmentInput {
  action:
    | "plan"
    | "status"
    | "ready"
    | "claim"
    | "show"
    | "release"
    | "approve"
    | "prioritize"
    | "explain";
  workId?: string;
  assignmentId?: string;
  gateId?: string;
  agentId?: string;
  actor?: string;
  role?: string;
  readOnly?: boolean;
  ttlMinutes?: number;
  priority?: number;
}

export interface DecisionInput {
  statement: string;
  reasoning: string;
  consequences: string[];
  scope: string[];
  keywords: string[];
  relatedWork: string[];
  supersedes?: string;
  kind?: "architecture" | "bugfix" | "feature-note";
  evidence?: string[];
}

export interface ValidationInput {
  paths?: string[];
  workId?: string;
}

export interface HandoffInput {
  assignmentId?: string;
  handoff: CreateAgentHandoffInput;
}

export type StartableWorkKind = "task" | "issue";

export interface StartWorkInput {
  kind: StartableWorkKind;
  id: string;
}

export interface CompleteWorkInput {
  decisionId?: string;
  noDecisionReason?: string;
}

export interface SupportedAutoForgeOperations<
  Projects = ProtocolData,
  Status = ProtocolData,
  Work = ProtocolData,
  Context = ProtocolData,
  Check = ProtocolData,
  Assignment = ProtocolData,
  Decision = ProtocolData,
  Validation = ProtocolData,
  Handoff = ProtocolData,
  Start = ProtocolData,
  Complete = ProtocolData,
> {
  projects: SdkOperation<ProjectsInput, Projects>;
  status: SdkQuery<Status>;
  work: SdkOperation<WorkInput, Work>;
  context: SdkOperation<ContextInput, Context>;
  check: SdkOperation<CheckInput, Check>;
  assignments: SdkOperation<AssignmentInput, Assignment>;
  decisions: SdkOperation<DecisionInput, Decision>;
  validation: SdkOperation<ValidationInput, Validation>;
  handoffs: SdkOperation<HandoffInput, Handoff>;
  startWork: SdkOperation<StartWorkInput, Start>;
  completeWork: SdkOperation<CompleteWorkInput, Complete>;
}

export const SDK_OPERATION_CAPABILITIES = [
  "projects",
  "status",
  "intent",
  "work",
  "context",
  "checks",
  "assignments",
  "decisions",
  "validation",
  "handoffs",
  "completion",
] as const;

export type SdkOperationCapability =
  (typeof SDK_OPERATION_CAPABILITIES)[number];
