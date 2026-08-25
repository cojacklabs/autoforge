import { READINESS_WORK_KINDS } from "@cojacklabs/autoforge-protocol";
import { z } from "zod";

export const TRIAGE_LABELS = [
  "READY_FOR_IMPLEMENTATION",
  "RESEARCH_REQUIRED",
  "CLARIFICATION_REQUIRED",
  "PLANNING_REQUIRED",
  "ARCHITECTURE_REQUIRED",
  "DESIGN_REQUIRED",
  "CONFLICT_DETECTED",
  "DEFERRED",
] as const;
export const triageLabelSchema = z.enum(TRIAGE_LABELS);
export const triageIntentSchema = z
  .object({
    raw: z.string().trim().min(1).max(20_000),
    objective: z.string().trim().min(1).max(2_000).optional(),
    requirements: z.array(z.string().trim().min(1).max(2_000)).default([]),
    assumptions: z.array(z.string().trim().min(1).max(2_000)).default([]),
    unknowns: z.array(z.string().trim().min(1).max(2_000)).default([]),
    constraints: z.array(z.string().trim().min(1).max(2_000)).default([]),
    acceptanceCriteria: z
      .array(z.string().trim().min(1).max(2_000))
      .default([]),
  })
  .strict();
export const triageResultSchema = z
  .object({
    labels: z.array(triageLabelSchema).min(1),
    evidence: z.array(z.string().trim().min(1).max(1_000)).min(1),
    conflict: z.boolean(),
  })
  .strict();
export type TriageIntent = z.infer<typeof triageIntentSchema>;
export type TriageLabel = z.infer<typeof triageLabelSchema>;
export type TriageResult = z.infer<typeof triageResultSchema>;

const KEYWORDS = {
  research: /\b(research|investigate|compare|evaluate|explore|unknown)\b/i,
  architecture: /\b(architect|architecture|system design|integration|api)\b/i,
  design: /\b(design|screen|component|visual|ui|ux|responsive)\b/i,
  planning: /\b(plan|planning|roadmap|break down|user stor(?:y|ies))\b/i,
  deferred:
    /\b(defer|deferred|someday|backlog)\b|\b(?:address|handle|implement|consider|revisit|schedule|move|leave|save)\b(?:\W+\w+){0,8}\W+later\b|\blater\b(?:\W+\w+){0,5}\W+\b(?:phase|release|version|milestone|backlog)\b/i,
  conflict: /\b(always|never)\b(?:\W+\w+){0,12}\W+\b(?:unless|except|but)\b/i,
};

function textSegments(intent: TriageIntent): string[] {
  return [
    intent.raw,
    ...(intent.objective ? [intent.objective] : []),
    ...intent.requirements,
    ...intent.assumptions,
    ...intent.unknowns,
    ...intent.constraints,
    ...intent.acceptanceCriteria,
  ].flatMap((value) =>
    value
      .split(/(?<=[.!?])\s+|\n+/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function triageIntent(input: TriageIntent): TriageResult {
  const intent = triageIntentSchema.parse(input);
  const segments = textSegments(intent);
  const text = segments.join(" ");
  const labels: TriageLabel[] = [];
  const evidence: string[] = [];
  if (segments.some((segment) => KEYWORDS.deferred.test(segment))) {
    labels.push("DEFERRED");
    evidence.push("Intent contains an explicit defer or later signal.");
  }
  if (intent.unknowns.length > 0 || KEYWORDS.research.test(text)) {
    labels.push("RESEARCH_REQUIRED");
    evidence.push("Intent contains unresolved questions or research language.");
  }
  if (intent.unknowns.length > 0 || !intent.objective) {
    labels.push("CLARIFICATION_REQUIRED");
    evidence.push(
      "Objective or required clarification evidence is incomplete.",
    );
  }
  if (KEYWORDS.planning.test(text)) {
    labels.push("PLANNING_REQUIRED");
    evidence.push("Intent contains planning or decomposition language.");
  }
  if (KEYWORDS.architecture.test(text)) {
    labels.push("ARCHITECTURE_REQUIRED");
    evidence.push(
      "Intent contains architecture, API, or integration language.",
    );
  }
  if (KEYWORDS.design.test(text)) {
    labels.push("DESIGN_REQUIRED");
    evidence.push("Intent contains design, UI, screen, or component language.");
  }
  if (segments.some((segment) => KEYWORDS.conflict.test(segment))) {
    labels.push("CONFLICT_DETECTED");
    evidence.push(
      "Intent contains contradictory absolute and exception language.",
    );
  }
  if (
    Boolean(intent.objective) &&
    intent.requirements.length > 0 &&
    intent.acceptanceCriteria.length > 0 &&
    intent.unknowns.length === 0 &&
    labels.length === 0
  ) {
    labels.push("READY_FOR_IMPLEMENTATION");
    evidence.push(
      "Objective, requirements, and acceptance criteria are present with no blockers.",
    );
  }
  return triageResultSchema.parse({
    labels,
    evidence,
    conflict: labels.includes("CONFLICT_DETECTED"),
  });
}

export const readinessWorkKindSchema = z.enum(READINESS_WORK_KINDS);
export const readinessLevelSchema = z.enum([
  "not-ready",
  "needs-input",
  "ready",
]);
export const readinessResultSchema = z
  .object({
    workKind: readinessWorkKindSchema,
    level: readinessLevelSchema,
    confidence: z.number().int().min(0).max(100),
    known: z.array(z.string().trim().min(1)),
    missing: z.array(z.string().trim().min(1)),
    blockers: z.array(z.string().trim().min(1)),
  })
  .strict();
export type ReadinessWorkKind = z.infer<typeof readinessWorkKindSchema>;
export type ReadinessResult = z.infer<typeof readinessResultSchema>;
type EvidenceField = keyof Pick<
  TriageIntent,
  | "objective"
  | "requirements"
  | "unknowns"
  | "constraints"
  | "acceptanceCriteria"
>;
const PROFILES: Record<ReadinessWorkKind, readonly EvidenceField[]> = {
  implementation: ["objective", "requirements", "acceptanceCriteria"],
  research: ["objective", "unknowns"],
  architecture: ["objective", "requirements", "constraints"],
  design: ["objective", "requirements", "acceptanceCriteria"],
  planning: ["objective", "requirements"],
  data: ["objective", "requirements", "constraints"],
  security: ["objective", "requirements", "constraints"],
};
const FIELD_LABELS: Record<EvidenceField, string> = {
  objective: "Objective",
  requirements: "Requirements",
  unknowns: "Research questions",
  constraints: "Constraints",
  acceptanceCriteria: "Acceptance criteria",
};
function present(intent: TriageIntent, field: EvidenceField): boolean {
  const value = intent[field];
  return typeof value === "string"
    ? value.trim().length > 0
    : (value?.length ?? 0) > 0;
}
export function evaluateReadiness(
  input: TriageIntent,
  workKind: ReadinessWorkKind,
): ReadinessResult {
  const intent = triageIntentSchema.parse(input);
  const kind = readinessWorkKindSchema.parse(workKind);
  const required = PROFILES[kind];
  const known = required
    .filter((field) => present(intent, field))
    .map((field) => FIELD_LABELS[field]);
  const missing = required
    .filter((field) => !present(intent, field))
    .map((field) => FIELD_LABELS[field]);
  const blockers =
    kind === "research"
      ? []
      : intent.unknowns.map((unknown) => `Unresolved: ${unknown}`);
  const confidence = Math.round((known.length / required.length) * 100);
  const level =
    missing.length === 0 && blockers.length === 0
      ? "ready"
      : known.length === 0
        ? "not-ready"
        : "needs-input";
  return readinessResultSchema.parse({
    workKind: kind,
    level,
    confidence,
    known,
    missing,
    blockers,
  });
}

export const workflowStageSchema = z.enum([
  "clarification",
  "research",
  "architecture",
  "design",
  "planning",
  "implementation",
  "validation",
]);
export const workflowRecommendationSchema = z
  .object({
    stages: z.array(workflowStageSchema).min(1),
    rationale: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type WorkflowRecommendation = z.infer<
  typeof workflowRecommendationSchema
>;
export function recommendWorkflow(
  labels: readonly string[],
  readiness: "not-ready" | "needs-input" | "ready",
): WorkflowRecommendation {
  const stages: z.infer<typeof workflowStageSchema>[] = [];
  const rationale: string[] = [];
  if (
    labels.includes("CLARIFICATION_REQUIRED") ||
    readiness === "needs-input"
  ) {
    stages.push("clarification");
    rationale.push("Resolve missing intent evidence before execution.");
  }
  if (labels.includes("RESEARCH_REQUIRED")) {
    stages.push("research");
    rationale.push(
      "Research-required evidence must be resolved before execution.",
    );
  }
  if (labels.includes("ARCHITECTURE_REQUIRED")) {
    stages.push("architecture");
    rationale.push(
      "Architecture-required evidence calls for system design work.",
    );
  }
  if (labels.includes("DESIGN_REQUIRED")) {
    stages.push("design");
    rationale.push("Design-required evidence calls for UI or UX definition.");
  }
  if (labels.includes("PLANNING_REQUIRED")) {
    stages.push("planning");
    rationale.push(
      "Planning-required evidence calls for bounded work decomposition.",
    );
  }
  if (readiness === "ready" && !labels.includes("DEFERRED")) {
    stages.push("implementation", "validation");
    rationale.push(
      "Readiness evidence supports implementation followed by validation.",
    );
  }
  if (stages.length === 0) {
    stages.push("planning");
    rationale.push("Use planning to determine the next bounded action.");
  }
  return workflowRecommendationSchema.parse({
    stages: [...new Set(stages)],
    rationale,
  });
}
