import { describe, expect, it } from "vitest";

import {
  decisionMemorySchema,
  decisionSchema,
} from "../src/decisions/schemas.js";

const CREATED_AT = "2026-08-20T02:00:00.000Z";
const UPDATED_AT = "2026-08-20T02:30:00.000Z";

function decision(
  overrides: Partial<Parameters<typeof decisionSchema.parse>[0]> = {},
) {
  return {
    id: "decision.use-filesystem-state",
    statement: "Use filesystem-based local state.",
    reasoning: "The control plane must work without external infrastructure.",
    consequences: ["State remains portable and project-local."],
    scope: ["architecture", "state"],
    keywords: ["filesystem", "local-state", "persistence"],
    relatedWork: ["feature.control-kernel", "task.persist-state"],
    supersedes: null,
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

describe("decision contracts", () => {
  it("accepts rationale, scope, keywords, and work relationships", () => {
    expect(decisionSchema.parse(decision())).toMatchObject({
      id: "decision.use-filesystem-state",
      status: "active",
      relatedWork: ["feature.control-kernel", "task.persist-state"],
    });
  });

  it("rejects non-canonical or duplicate search metadata", () => {
    expect(
      decisionSchema.safeParse(decision({ keywords: ["File System"] })).success,
    ).toBe(false);
    expect(
      decisionSchema.safeParse(
        decision({ scope: ["architecture", "architecture"] }),
      ).success,
    ).toBe(false);
  });

  it("rejects invalid work relationships and timestamps", () => {
    expect(
      decisionSchema.safeParse(decision({ relatedWork: ["decision.wrong"] }))
        .success,
    ).toBe(false);
    expect(
      decisionSchema.safeParse(
        decision({ updatedAt: "2026-08-20T01:00:00.000Z" }),
      ).success,
    ).toBe(false);
  });
});

describe("decision memory contracts", () => {
  it("accepts a valid supersession chain", () => {
    const original = decision({
      id: "decision.use-json-state",
      statement: "Use one JSON state file.",
      status: "superseded",
      updatedAt: UPDATED_AT,
    });
    const replacement = decision({
      id: "decision.split-state-files",
      statement: "Separate work and session state.",
      supersedes: "decision.use-json-state",
    });

    expect(
      decisionMemorySchema.safeParse({ decisions: [original, replacement] })
        .success,
    ).toBe(true);
  });

  it("rejects duplicate IDs and missing supersession targets", () => {
    expect(
      decisionMemorySchema.safeParse({ decisions: [decision(), decision()] })
        .success,
    ).toBe(false);
    expect(
      decisionMemorySchema.safeParse({
        decisions: [decision({ supersedes: "decision.missing" })],
      }).success,
    ).toBe(false);
  });

  it("rejects unreferenced superseded status", () => {
    expect(
      decisionMemorySchema.safeParse({
        decisions: [decision({ status: "superseded" })],
      }).success,
    ).toBe(false);
  });

  it("rejects self-reference and supersession cycles", () => {
    expect(
      decisionMemorySchema.safeParse({
        decisions: [
          decision({
            supersedes: "decision.use-filesystem-state",
            status: "superseded",
          }),
        ],
      }).success,
    ).toBe(false);

    expect(
      decisionMemorySchema.safeParse({
        decisions: [
          decision({
            id: "decision.first",
            supersedes: "decision.second",
            status: "superseded",
          }),
          decision({
            id: "decision.second",
            supersedes: "decision.first",
            status: "superseded",
          }),
        ],
      }).success,
    ).toBe(false);
  });
});

describe("decision kind", () => {
  it("defaults kind to architecture when omitted", () => {
    const decision_obj = decisionSchema.parse({
      id: "decision.example",
      statement: "Example statement.",
      reasoning: "Example reasoning.",
      consequences: ["Example consequence."],
      scope: ["example"],
      keywords: ["example"],
      relatedWork: [],
      supersedes: null,
      status: "active",
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    });
    expect(decision_obj.kind).toBe("architecture");
  });

  it("accepts an explicit bugfix kind", () => {
    const decision_obj = decisionSchema.parse({
      id: "decision.example-bugfix",
      statement: "Example statement.",
      reasoning: "Example reasoning.",
      consequences: ["Example consequence."],
      scope: ["example"],
      keywords: ["example"],
      relatedWork: [],
      supersedes: null,
      status: "active",
      kind: "bugfix",
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    });
    expect(decision_obj.kind).toBe("bugfix");
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      decisionSchema.parse({
        id: "decision.example-bad-kind",
        statement: "Example statement.",
        reasoning: "Example reasoning.",
        consequences: ["Example consequence."],
        scope: ["example"],
        keywords: ["example"],
        relatedWork: [],
        supersedes: null,
        status: "active",
        kind: "not-a-real-kind",
        createdAt: "2026-08-22T00:00:00.000Z",
        updatedAt: "2026-08-22T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
