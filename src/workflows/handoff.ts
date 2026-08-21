import { z } from "zod";

import { workflowStageDefinitionSchema } from "./definitions.js";

export const workflowHandoffSchema = z
  .object({
    workflowId: z.string().min(1),
    workflowKind: z.string().min(1),
    fromStage: workflowStageDefinitionSchema.shape.id,
    toStage: workflowStageDefinitionSchema.shape.id,
    objective: z.string().min(1),
    completedWork: z.array(z.string().min(1)),
    decisions: z.array(z.string().min(1)),
    openQuestions: z.array(z.string().min(1)),
    validation: z.array(z.string().min(1)),
    sourceArtifacts: z.array(z.string().min(1)),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type WorkflowHandoff = z.infer<typeof workflowHandoffSchema>;

export function createWorkflowHandoff(
  input: Omit<WorkflowHandoff, "createdAt">,
  now = new Date(),
): WorkflowHandoff {
  return workflowHandoffSchema.parse({
    ...input,
    createdAt: now.toISOString(),
  });
}
