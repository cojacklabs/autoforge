import { z } from "zod";

export const agentPlanSchema = z
  .object({
    summary: z.string().min(1).max(4_000),
    clarificationQuestions: z.array(z.string().min(1).max(1_000)).max(5),
    edits: z
      .array(
        z
          .object({
            path: z.string().min(1).max(1_000),
            description: z.string().min(1).max(2_000),
            content: z.string().max(1_000_000),
          })
          .strict(),
      )
      .max(50),
    validationPaths: z.array(z.string().min(1).max(1_000)).max(100),
    risks: z.array(z.string().min(1).max(2_000)).max(20),
    openQuestions: z.array(z.string().min(1).max(2_000)).max(20),
    nextAction: z.string().min(1).max(2_000),
  })
  .strict();

export type AgentPlan = z.infer<typeof agentPlanSchema>;
