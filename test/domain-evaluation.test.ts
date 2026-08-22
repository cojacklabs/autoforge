import { describe, expect, it } from "vitest";
import {
  evaluateDomainInvariants,
  traverseDomain,
} from "../src/domain/evaluate.js";
import { domainArtifactSchema } from "../src/domain/schemas.js";

const artifact = domainArtifactSchema.parse({
  id: "domain-artifact.product",
  concepts: [
    {
      id: "domain.user",
      name: "User",
      description: "Account.",
      lifecycle: "confirmed",
    },
    {
      id: "domain.profile",
      name: "Profile",
      description: "Profile.",
      lifecycle: "confirmed",
    },
    {
      id: "domain.resume",
      name: "Resume",
      description: "Resume.",
      lifecycle: "confirmed",
    },
  ],
  relationships: [
    {
      id: "domain-relation.user-profile",
      sourceId: "domain.user",
      targetId: "domain.profile",
      type: "owns",
      rationale: "ownership",
      lifecycle: "confirmed",
    },
    {
      id: "domain-relation.profile-resume",
      sourceId: "domain.profile",
      targetId: "domain.resume",
      type: "supplies",
      rationale: "source",
      lifecycle: "confirmed",
    },
  ],
  invariants: [],
  updatedAt: "2026-08-22T00:00:00Z",
});

describe("domain evaluation", () => {
  it("traverses outgoing relationships deterministically", () => {
    expect(traverseDomain(artifact, "domain.user")).toEqual([
      "domain.profile",
      "domain.resume",
    ]);
  });

  it("keeps missing invariant evidence explicitly unknown", () => {
    const result = evaluateDomainInvariants([
      {
        id: "domain-invariant.active-resume",
        statement: "One active resume.",
        scope: ["domain.user"],
        severity: "critical",
        lifecycle: "provisional",
        evidence: [],
        provenance: [],
      },
    ]);
    expect(result[0]?.status).toBe("unknown");
  });
});
