export const READINESS_WORK_KINDS = [
  "implementation",
  "research",
  "architecture",
  "design",
  "planning",
  "data",
  "security",
] as const;

export const WORKFLOW_KINDS = [
  "feature-development",
  "bug-fix",
  "research",
  "design-create",
  "design-critique",
  "architecture-change",
  "data-change",
  "security-change",
  "validation",
] as const;

export type ReadinessWorkKindVocabulary = (typeof READINESS_WORK_KINDS)[number];
export type WorkflowKindVocabulary = (typeof WORKFLOW_KINDS)[number];

export const INTENT_TO_WORKFLOW_KINDS: Readonly<
  Record<ReadinessWorkKindVocabulary, readonly WorkflowKindVocabulary[]>
> = {
  implementation: ["feature-development", "bug-fix"],
  research: ["research"],
  architecture: ["architecture-change"],
  design: ["design-create", "design-critique"],
  planning: ["feature-development", "architecture-change", "design-create"],
  data: ["data-change"],
  security: ["security-change"],
};

const WORKFLOW_KIND_ALIASES: Readonly<
  Record<ReadinessWorkKindVocabulary, WorkflowKindVocabulary>
> = {
  implementation: "feature-development",
  research: "research",
  architecture: "architecture-change",
  design: "design-create",
  planning: "feature-development",
  data: "data-change",
  security: "security-change",
};

export function normalizeWorkflowKind(
  value: string,
): WorkflowKindVocabulary | undefined {
  if (WORKFLOW_KINDS.includes(value as WorkflowKindVocabulary)) {
    return value as WorkflowKindVocabulary;
  }
  return WORKFLOW_KIND_ALIASES[value as ReadinessWorkKindVocabulary];
}

export function workflowKindHelp(): string {
  return `Valid workflow kinds: ${WORKFLOW_KINDS.join(", ")}. Intent aliases: architecture→architecture-change, design→design-create, implementation→feature-development, planning→feature-development, data→data-change, security→security-change.`;
}
