import {
  governanceEvaluationSchema,
  type ConstitutionArtifact,
  type GovernanceEvaluation,
  type GovernanceRule,
} from "./schemas.js";

export interface GovernanceEvaluationInput {
  objective: string;
  workKind?: string;
  release?: string;
  paths?: string[];
  tags?: string[];
}

function applies(
  rule: GovernanceRule,
  input: GovernanceEvaluationInput,
): boolean {
  const scope = rule.scope;
  return (
    (scope.workKinds.length === 0 ||
      scope.workKinds.includes(input.workKind ?? "")) &&
    (scope.releases.length === 0 ||
      scope.releases.includes(input.release ?? "")) &&
    (scope.tags.length === 0 ||
      scope.tags.some((tag) => input.tags?.includes(tag))) &&
    (scope.paths.length === 0 ||
      scope.paths.some((path) => input.paths?.includes(path)))
  );
}

export function selectApplicableRules(
  constitution: ConstitutionArtifact,
  input: GovernanceEvaluationInput,
): GovernanceRule[] {
  return constitution.rules.filter((rule) => applies(rule, input));
}

export function evaluateGovernance(
  constitution: ConstitutionArtifact,
  input: GovernanceEvaluationInput,
): GovernanceEvaluation[] {
  const objective = input.objective.toLowerCase();
  return selectApplicableRules(constitution, input).map((rule) => {
    const conflict = rule.nonGoals.some((nonGoal) =>
      objective.includes(nonGoal.toLowerCase()),
    );
    const status = conflict
      ? rule.enforcement === "hard"
        ? "blocked"
        : rule.enforcement === "advisory"
          ? "warning"
          : "conflict"
      : "pass";
    return governanceEvaluationSchema.parse({
      status,
      ruleId: rule.id,
      reason: conflict
        ? `Objective conflicts with governance rule: ${rule.statement}`
        : `Objective satisfies governance rule: ${rule.statement}`,
    });
  });
}
