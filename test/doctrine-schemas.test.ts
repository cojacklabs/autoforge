import { describe, expect, it } from "vitest";

import {
  INITIAL_DOCTRINE_NAMES,
  MAX_DOCTRINE_CONTENT_CHARACTERS,
  doctrineRegistrySchema,
  doctrineSchema,
} from "../src/doctrine/schemas.js";

const CREATED_AT = "2026-08-20T07:00:00.000Z";

function doctrine(overrides: Record<string, unknown> = {}) {
  return {
    id: "doctrine.testing",
    name: "testing",
    title: "Testing Doctrine",
    summary: "Verify behavior with focused automated evidence.",
    content:
      "# Testing\n\n- Test observable behavior.\n- Start focused, then broaden.",
    routing: {
      keywords: ["test", "testing", "verification"],
      workKinds: ["task", "issue"],
      scopeTags: ["quality"],
      pathPatterns: ["test/**", "src/**/*.test.ts"],
    },
    source: "builtin",
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

describe("doctrine contracts", () => {
  it("defines the required initial doctrine names", () => {
    expect(INITIAL_DOCTRINE_NAMES).toEqual([
      "router",
      "planning",
      "decisions",
      "scope",
      "questions",
      "testing",
      "frontend",
      "backend",
      "design",
      "security",
    ]);
  });

  it("accepts compact guidance and deterministic routing metadata", () => {
    expect(doctrineSchema.parse(doctrine())).toMatchObject({
      id: "doctrine.testing",
      name: "testing",
      source: "builtin",
      status: "active",
    });
  });

  it("rejects encyclopedia-sized doctrine content", () => {
    expect(
      doctrineSchema.safeParse(
        doctrine({ content: "x".repeat(MAX_DOCTRINE_CONTENT_CHARACTERS + 1) }),
      ).success,
    ).toBe(false);
  });

  it("requires stable ID and name agreement", () => {
    expect(
      doctrineSchema.safeParse(doctrine({ id: "doctrine.security" })).success,
    ).toBe(false);
  });

  it("rejects duplicate or unsafe routing signals", () => {
    expect(
      doctrineSchema.safeParse(
        doctrine({
          routing: {
            keywords: ["testing", "testing"],
            workKinds: [],
            scopeTags: [],
            pathPatterns: [],
          },
        }),
      ).success,
    ).toBe(false);
    expect(
      doctrineSchema.safeParse(
        doctrine({
          routing: {
            keywords: [],
            workKinds: [],
            scopeTags: [],
            pathPatterns: ["../outside/**"],
          },
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects duplicate registry identity", () => {
    expect(
      doctrineRegistrySchema.safeParse({
        doctrines: [doctrine(), doctrine()],
      }).success,
    ).toBe(false);
  });
});
