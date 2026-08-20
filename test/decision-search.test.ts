import { describe, expect, it } from "vitest";

import { searchDecisions } from "../src/decisions/search.js";
import {
  decisionMemorySchema,
  type Decision,
} from "../src/decisions/schemas.js";

const TIMESTAMP = "2026-08-20T05:00:00.000Z";

function decision(overrides: Partial<Decision>): Decision {
  return {
    id: "decision.default",
    statement: "Use the default architecture.",
    reasoning: "The default is predictable.",
    consequences: ["Implementation remains straightforward."],
    scope: ["architecture"],
    keywords: ["default"],
    relatedWork: [],
    supersedes: null,
    status: "active",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function memory() {
  return decisionMemorySchema.parse({
    decisions: [
      decision({
        id: "decision.use-postgres",
        statement: "Use PostgreSQL for durable application data.",
        reasoning: "Relational integrity supports the application domain.",
        consequences: ["Deployments require a managed database."],
        scope: ["backend", "database"],
        keywords: ["postgres", "relational", "sql"],
        relatedWork: ["feature.data-platform"],
      }),
      decision({
        id: "decision.use-filesystem-memory",
        statement: "Use local files for control-plane memory.",
        reasoning: "Local persistence avoids database infrastructure.",
        consequences: ["Memory remains portable."],
        scope: ["architecture", "decisions"],
        keywords: ["filesystem", "local-state", "persistence"],
        relatedWork: ["feature.decision-memory"],
      }),
      decision({
        id: "decision.legacy-search",
        statement: "Use fuzzy legacy search.",
        reasoning: "The original prototype favored broad matching.",
        consequences: ["Results were difficult to explain."],
        scope: ["decisions", "search"],
        keywords: ["fuzzy", "legacy"],
        status: "superseded",
      }),
      decision({
        id: "decision.deterministic-search",
        statement: "Use deterministic relevance search.",
        reasoning: "Fixed weights make every match explainable.",
        consequences: ["Search does not require embeddings."],
        scope: ["decisions", "search"],
        keywords: ["deterministic", "relevance"],
        supersedes: "decision.legacy-search",
      }),
    ],
  });
}

describe("deterministic decision search", () => {
  it("ranks explicit keyword and statement matches above reasoning", () => {
    const results = searchDecisions(memory(), { query: "postgres database" });

    expect(results.map((result) => result.decision.id)).toEqual([
      "decision.use-postgres",
      "decision.use-filesystem-memory",
    ]);
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
    expect(results[0]?.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("keywords: postgres"),
        expect.stringContaining("scope: database"),
      ]),
    );
  });

  it("matches deterministic prefixes and related terminology", () => {
    const [result] = searchDecisions(memory(), { query: "determinism relev" });

    expect(result?.decision.id).toBe("decision.deterministic-search");
    expect(result?.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining("keywords")]),
    );
  });

  it("boosts decisions related to explicit work", () => {
    const [result] = searchDecisions(memory(), {
      query: "persistence",
      relatedWork: ["feature.decision-memory"],
    });

    expect(result?.decision.id).toBe("decision.use-filesystem-memory");
    expect(result?.reasons).toContain("relatedWork: feature.decision-memory");
  });

  it("excludes superseded decisions unless history is requested", () => {
    expect(searchDecisions(memory(), { query: "fuzzy legacy" })).toEqual([]);
    expect(
      searchDecisions(memory(), {
        query: "fuzzy legacy",
        includeSuperseded: true,
      }).map((result) => result.decision.id),
    ).toContain("decision.legacy-search");
    expect(
      searchDecisions(memory(), {
        query: "fuzzy legacy",
        includeSuperseded: true,
      })[0]?.supersededBy,
    ).toBe("decision.deterministic-search");
  });

  it("uses decision ID as the stable tie breaker and honors limits", () => {
    const tiedMemory = decisionMemorySchema.parse({
      decisions: [
        decision({ id: "decision.zeta", keywords: ["shared"] }),
        decision({ id: "decision.alpha", keywords: ["shared"] }),
      ],
    });

    expect(
      searchDecisions(tiedMemory, { query: "shared", limit: 1 }).map(
        (result) => result.decision.id,
      ),
    ).toEqual(["decision.alpha"]);
  });

  it("supports work-only search and decision inventory", () => {
    expect(
      searchDecisions(memory(), {
        query: "",
        relatedWork: ["feature.data-platform"],
      })[0]?.decision.id,
    ).toBe("decision.use-postgres");
    expect(searchDecisions(memory(), { query: "" })).toHaveLength(3);
    expect(() =>
      searchDecisions(memory(), { query: "postgres", limit: 0 }),
    ).toThrowError();
  });
});
