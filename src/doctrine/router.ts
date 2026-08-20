import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { Doctrine, DoctrineRegistry, DoctrineRouting } from "./schemas.js";

const ROUTING_WEIGHTS = {
  router: 1_000,
  keyword: 10,
  workKind: 20,
  scopeTag: 30,
  pathPattern: 40,
} as const;

type WorkKind = DoctrineRouting["workKinds"][number];

export interface DoctrineRoutingInput {
  objective?: string;
  workKind?: WorkKind;
  scopeTags?: readonly string[];
  paths?: readonly string[];
  limit?: number;
}

export interface DoctrineSelectionReason {
  signal: "router" | "keyword" | "work-kind" | "scope-tag" | "path-pattern";
  value: string;
  weight: number;
}

export interface DoctrineSelection {
  doctrine: Doctrine;
  score: number;
  reasons: DoctrineSelectionReason[];
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeToken(value)
      .split(/[^a-z0-9._/-]+/)
      .filter(Boolean),
  );
}

function hasKeyword(tokens: ReadonlySet<string>, keyword: string): boolean {
  const normalizedKeyword = normalizeToken(keyword);
  return [...tokens].some(
    (token) =>
      token === normalizedKeyword ||
      (token.length >= 4 && normalizedKeyword.startsWith(token)) ||
      (normalizedKeyword.length >= 4 && token.startsWith(normalizedKeyword)),
  );
}

function normalizePath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[a-z]:\//i.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new AutoForgeError(
      "INVALID_ARGUMENT",
      "Doctrine routing paths must be repository-relative",
      { details: { path: value }, exitCode: EXIT_CODE.usage },
    );
  }
  return normalized;
}

function globExpression(pattern: string): RegExp {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (character === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") {
        expression += "(?:.*/)?";
        index += 2;
      } else {
        expression += ".*";
        index += 1;
      }
    } else if (character === "*") {
      expression += "[^/]*";
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${expression}$`);
}

function scoreDoctrine(
  doctrine: Doctrine,
  input: DoctrineRoutingInput,
  objectiveTokens: ReadonlySet<string>,
  scopeTags: ReadonlySet<string>,
  paths: readonly string[],
): DoctrineSelection | undefined {
  const reasons: DoctrineSelectionReason[] = [];

  if (doctrine.name === "router") {
    reasons.push({
      signal: "router",
      value: doctrine.id,
      weight: ROUTING_WEIGHTS.router,
    });
  }
  for (const keyword of doctrine.routing.keywords) {
    if (hasKeyword(objectiveTokens, keyword)) {
      reasons.push({
        signal: "keyword",
        value: keyword,
        weight: ROUTING_WEIGHTS.keyword,
      });
    }
  }
  if (input.workKind && doctrine.routing.workKinds.includes(input.workKind)) {
    reasons.push({
      signal: "work-kind",
      value: input.workKind,
      weight: ROUTING_WEIGHTS.workKind,
    });
  }
  for (const tag of doctrine.routing.scopeTags) {
    if (scopeTags.has(normalizeToken(tag))) {
      reasons.push({
        signal: "scope-tag",
        value: tag,
        weight: ROUTING_WEIGHTS.scopeTag,
      });
    }
  }
  for (const pattern of doctrine.routing.pathPatterns) {
    if (paths.some((candidate) => globExpression(pattern).test(candidate))) {
      reasons.push({
        signal: "path-pattern",
        value: pattern,
        weight: ROUTING_WEIGHTS.pathPattern,
      });
    }
  }

  if (reasons.length === 0) {
    return undefined;
  }
  return {
    doctrine,
    reasons,
    score: reasons.reduce((total, reason) => total + reason.weight, 0),
  };
}

export function routeDoctrines(
  registry: DoctrineRegistry,
  input: DoctrineRoutingInput,
): DoctrineSelection[] {
  const limit = input.limit ?? registry.doctrines.length;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new AutoForgeError(
      "INVALID_ARGUMENT",
      "Doctrine routing limit must be a positive integer",
      { details: { limit }, exitCode: EXIT_CODE.usage },
    );
  }

  const objectiveTokens = tokenize(input.objective ?? "");
  const scopeTags = new Set((input.scopeTags ?? []).map(normalizeToken));
  const paths = [...new Set((input.paths ?? []).map(normalizePath))];

  return registry.doctrines
    .filter((doctrine) => doctrine.status === "active")
    .map((doctrine) =>
      scoreDoctrine(doctrine, input, objectiveTokens, scopeTags, paths),
    )
    .filter(
      (selection): selection is DoctrineSelection => selection !== undefined,
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.doctrine.id.localeCompare(right.doctrine.id),
    )
    .slice(0, limit);
}
