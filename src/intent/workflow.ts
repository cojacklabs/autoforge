import { z } from "zod";

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
  if (labels.includes("RESEARCH_REQUIRED")) stages.push("research");
  if (labels.includes("ARCHITECTURE_REQUIRED")) stages.push("architecture");
  if (labels.includes("DESIGN_REQUIRED")) stages.push("design");
  if (labels.includes("PLANNING_REQUIRED")) stages.push("planning");
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
