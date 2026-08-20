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
  deferred: /\b(later|defer|deferred|someday|backlog)\b/i,
  conflict: /\b(always|never)\b.*\b(?:unless|except|but)\b/i,
};

function searchableText(intent: TriageIntent): string {
  return [
    intent.raw,
    intent.objective ?? "",
    ...intent.requirements,
    ...intent.assumptions,
    ...intent.unknowns,
    ...intent.constraints,
    ...intent.acceptanceCriteria,
  ].join(" ");
}

export function triageIntent(input: TriageIntent): TriageResult {
  const intent = triageIntentSchema.parse(input);
  const text = searchableText(intent);
  const labels: TriageLabel[] = [];
  const evidence: string[] = [];

  if (KEYWORDS.deferred.test(text)) {
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
  if (KEYWORDS.conflict.test(text)) {
    labels.push("CONFLICT_DETECTED");
    evidence.push(
      "Intent contains contradictory absolute and exception language.",
    );
  }

  const ready =
    Boolean(intent.objective) &&
    intent.requirements.length > 0 &&
    intent.acceptanceCriteria.length > 0 &&
    intent.unknowns.length === 0 &&
    labels.length === 0;
  if (ready) {
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
