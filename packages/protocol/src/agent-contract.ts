import { z } from "zod";

export const agentContractSchema = z
  .object({
    version: z.string().min(1),
    agentId: z.string().min(1),
    projectRoot: z.string().min(1),
    activeWorkId: z.string().min(1).optional(),
    workflowKind: z.string().min(1).optional(),
    workflowStage: z.string().min(1).optional(),
    requiredActions: z.array(z.string().min(1)),
    prohibitedActions: z.array(z.string().min(1)),
    contextCommand: z.string().min(1),
    validationCommands: z.array(z.string().min(1)),
    completionRequirements: z.array(z.string().min(1)),
  })
  .strict();
export type AgentContract = z.infer<typeof agentContractSchema>;

export function validateAgentContract(input: unknown): AgentContract {
  return agentContractSchema.parse(input);
}
