import { describe, expect, it } from "vitest";
import {
  createKnowledgeArtifact,
  knowledgeArtifactSchema,
} from "../src/knowledge/artifacts.js";

describe("knowledge artifacts", () => {
  it("creates a stable, typed artifact", () => {
    expect(
      createKnowledgeArtifact({
        id: "knowledge.vision.product",
        kind: "vision",
        title: "Product direction",
        content: "Make project direction durable.",
        source: "discovery",
        createdAt: new Date("2026-08-21T00:00:00.000Z"),
      }),
    ).toMatchObject({
      id: "knowledge.vision.product",
      kind: "vision",
      createdAt: "2026-08-21T00:00:00.000Z",
    });
  });

  it("rejects malformed identifiers and empty content", () => {
    expect(() =>
      knowledgeArtifactSchema.parse({
        id: "vision",
        kind: "vision",
        title: "Missing namespace",
        content: "",
        source: "test",
        createdAt: "2026-08-21T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
