/**
 * AutoForge Domain Schemas (v1)
 *
 * Strictly-typed canonical data models for the AutoForge Orchestration Kernel.
 */

export const WORK_ITEM_STATES = [
  "draft",
  "ready_for_planning",
  "plan_review",
  "ready_to_build",
  "building",
  "verify",
  "release_candidate",
  "awaiting_approval",
  "released",
  "blocked",
  "cancelled",
] as const;

export type WorkItemState = (typeof WORK_ITEM_STATES)[number];

export const RISK_TIERS = ["R0", "R1", "R2", "R3"] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export interface WorkItem {
  id: string; // e.g. "WI-2026-001"
  title: string;
  objective: string;
  riskTier: RiskTier;
  state: WorkItemState;
  owner: string; // Accountable human or agent identifier
  acceptanceCriteria: string[];
  linkedArtifacts: string[];
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export const RUN_STATUSES = [
  "pending",
  "running",
  "paused_approval",
  "completed",
  "failed",
  "cancelled",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export type AutonomyLevel = 0 | 1 | 2 | 3;

export interface Run {
  id: string; // e.g. "RUN-20260816-001"
  workItemId: string;
  recipeName: string;
  autonomyLevel: AutonomyLevel;
  status: RunStatus;
  currentStepId?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const STEP_STATUSES = [
  "pending",
  "running",
  "waiting_approval",
  "completed",
  "failed",
  "skipped",
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

export interface Step {
  id: string; // e.g. "STEP-01"
  runId: string;
  role: string; // e.g. "architect", "fullstack_engineer"
  action: string; // e.g. "design_api", "implement_code"
  status: StepStatus;
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface GateResult {
  id: string;
  runId: string;
  stepId?: string;
  gateType:
    | "parse"
    | "prettier"
    | "eslint"
    | "tsc"
    | "tests"
    | "security"
    | "custom";
  passed: boolean;
  command?: string;
  evidence?: Record<string, unknown>;
  errorContext?: string;
  executedAt: string;
}

export interface Decision {
  id: string;
  runId: string;
  stepId?: string;
  decisionClass: string; // e.g. "add_dependency", "database_migration", "staging_deploy"
  actor: string; // e.g. "agent:architect" or "user:colton"
  rationale: string;
  confidence?: number;
  policyOutcome: "allowed" | "escalated" | "rejected";
  recordedAt: string;
}

export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface Approval {
  id: string;
  runId: string;
  stepId?: string;
  decisionClass: string;
  scope: string;
  status: ApprovalStatus;
  requestedBy: string;
  approver?: string;
  note?: string;
  conditions?: string[];
  expiresAt?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface OrchestrationEvent {
  id: string;
  runId: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
