import { describe, expect, it } from "vitest";
import {
  domainConceptSchema,
  domainInvariantSchema,
  domainRelationshipSchema,
} from "../src/domain/schemas.js";

describe("domain schemas", () => {
  it("accepts concepts and explicit provenance", () => {
    const concept = domainConceptSchema.parse({
      id: "domain.user",
      name: "User",
      description: "A person with an account.",
      lifecycle: "confirmed",
      provenance: [
        {
          sourceType: "human",
          sourceId: "workshop-1",
          capturedAt: "2026-08-22T00:00:00Z",
        },
      ],
    });

    expect(concept.aliases).toEqual([]);
  });

  it("rejects self-referential relationships", () => {
    expect(() =>
      domainRelationshipSchema.parse({
        id: "domain-relation.user-owns-user",
        sourceId: "domain.user",
        targetId: "domain.user",
        type: "owns",
        rationale: "invalid",
        lifecycle: "provisional",
      }),
    ).toThrow();
  });

  it("requires invariant scope and preserves unknown evidence", () => {
    const invariant = domainInvariantSchema.parse({
      id: "domain-invariant.active-resume",
      statement: "A user has one canonical active resume.",
      scope: ["domain.user", "domain.resume"],
      severity: "critical",
      lifecycle: "provisional",
    });

    expect(invariant.evidence).toEqual([]);
  });
});
