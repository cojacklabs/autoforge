import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { Decision, DecisionMemory } from "./schemas.js";

const FIELD_WEIGHTS = {
  id: 20,
  relatedWork: 15,
  keywords: 12,
  scope: 10,
  statement: 8,
  reasoning: 4,
  consequences: 3,
  statementPhrase: 10,
} as const;

export interface DecisionSearchOptions {
  query: string;
  relatedWork?: readonly string[];
  includeSuperseded?: boolean;
  limit?: number;
}

export interface DecisionSearchMatch {
  decision: Decision;
  score: number;
  reasons: string[];
  supersededBy: string | null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized ? [...new Set(normalized.split(/\s+/))] : [];
}

function tokenMatches(queryToken: string, candidateToken: string): boolean {
  return (
    queryToken === candidateToken ||
    (queryToken.length >= 4 && candidateToken.startsWith(queryToken)) ||
    (candidateToken.length >= 4 && queryToken.startsWith(candidateToken))
  );
}

function matchingQueryTokens(
  queryTokens: readonly string[],
  values: readonly string[],
): string[] {
  const candidateTokens = values.flatMap(tokenize);
  return queryTokens.filter((queryToken) =>
    candidateTokens.some((candidateToken) =>
      tokenMatches(queryToken, candidateToken),
    ),
  );
}

function scoreField(
  reasons: string[],
  field: keyof typeof FIELD_WEIGHTS,
  queryTokens: readonly string[],
  values: readonly string[],
): number {
  const matches = matchingQueryTokens(queryTokens, values);
  if (matches.length === 0) {
    return 0;
  }
  reasons.push(`${field}: ${matches.join(", ")}`);
  return matches.length * FIELD_WEIGHTS[field];
}

function scoreDecision(
  decision: Decision,
  query: string,
  queryTokens: readonly string[],
  relatedWork: readonly string[],
  supersededBy: string | null,
): DecisionSearchMatch | undefined {
  const reasons: string[] = [];
  let score = 0;
  score += scoreField(reasons, "id", queryTokens, [decision.id]);
  score += scoreField(reasons, "keywords", queryTokens, decision.keywords);
  score += scoreField(reasons, "scope", queryTokens, decision.scope);
  score += scoreField(reasons, "statement", queryTokens, [decision.statement]);
  score += scoreField(reasons, "reasoning", queryTokens, [decision.reasoning]);
  score += scoreField(
    reasons,
    "consequences",
    queryTokens,
    decision.consequences,
  );

  const normalizedQuery = normalizeText(query);
  if (
    normalizedQuery.length > 0 &&
    normalizeText(decision.statement).includes(normalizedQuery)
  ) {
    score += FIELD_WEIGHTS.statementPhrase;
    reasons.push("statementPhrase: exact phrase");
  }

  const workMatches = relatedWork.filter((id) =>
    decision.relatedWork.includes(id),
  );
  if (workMatches.length > 0) {
    score += workMatches.length * FIELD_WEIGHTS.relatedWork;
    reasons.push(`relatedWork: ${workMatches.join(", ")}`);
  }

  return score > 0 ? { decision, score, reasons, supersededBy } : undefined;
}

export function searchDecisions(
  memory: DecisionMemory,
  options: DecisionSearchOptions,
): DecisionSearchMatch[] {
  const queryTokens = tokenize(options.query);
  const relatedWork = [...new Set(options.relatedWork ?? [])];
  if (queryTokens.length === 0 && relatedWork.length === 0) {
    const limit = options.limit ?? 10;
    return memory.decisions
      .filter(
        (decision) =>
          decision.status === "active" ||
          (options.includeSuperseded && decision.status === "superseded"),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit)
      .map((decision) => ({
        decision,
        score: 0,
        reasons: ["history: inventory"],
        supersededBy:
          memory.decisions.find(
            (candidate) => candidate.supersedes === decision.id,
          )?.id ?? null,
      }));
  }

  const limit = options.limit ?? 10;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new AutoForgeError(
      "INVALID_ARGUMENT",
      "Decision search limit must be a positive integer",
      {
        details: { limit },
        exitCode: EXIT_CODE.usage,
      },
    );
  }

  const replacementByDecision = new Map(
    memory.decisions
      .filter((decision) => decision.supersedes !== null)
      .map((decision) => [decision.supersedes!, decision.id]),
  );

  return memory.decisions
    .filter(
      (decision) =>
        decision.status === "active" ||
        (options.includeSuperseded && decision.status === "superseded"),
    )
    .map((decision) =>
      scoreDecision(
        decision,
        options.query,
        queryTokens,
        relatedWork,
        replacementByDecision.get(decision.id) ?? null,
      ),
    )
    .filter((match): match is DecisionSearchMatch => match !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.decision.id.localeCompare(right.decision.id),
    )
    .slice(0, limit);
}
