import type { GovernanceEvaluation } from "../governance/schemas.js";

export interface AgentGovernanceDirectives {
  requiredActions: string[];
  prohibitedActions: string[];
  evaluations: GovernanceEvaluation[];
}

export function createAgentGovernanceDirectives(
  evaluations: readonly GovernanceEvaluation[],
): AgentGovernanceDirectives {
  const requiredActions = evaluations
    .filter((evaluation) => evaluation.status === "pass")
    .map((evaluation) => `Follow ${evaluation.ruleId}: ${evaluation.reason}`);
  const prohibitedActions = evaluations
    .filter(
      (evaluation) =>
        evaluation.status === "blocked" || evaluation.status === "conflict",
    )
    .map((evaluation) => `Do not proceed: ${evaluation.reason}`);
  return {
    requiredActions,
    prohibitedActions,
    evaluations: evaluations.map((evaluation) => ({ ...evaluation })),
  };
}
