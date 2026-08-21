import { describe, expect, it } from "vitest";
import { createKnowledgeArtifact } from "../src/knowledge/artifacts.js";
import { KnowledgeRegistry } from "../src/knowledge/registry.js";

const artifact = (id: string) =>
  createKnowledgeArtifact({
    id,
    kind: id.includes("vision") ? "vision" : "feature",
    title: id,
    content: "Knowledge content",
    source: "test",
    createdAt: new Date("2026-08-21T00:00:00.000Z"),
  });

describe("knowledge registry", () => {
  it("stores deterministic artifacts and relationships", () => {
    const registry = new KnowledgeRegistry();
    registry.add(artifact("knowledge.feature.ordering"));
    registry.add(artifact("knowledge.vision.product"));
    registry.relate({
      from: "knowledge.feature.ordering",
      relation: "supports",
      to: "knowledge.vision.product",
    });

    expect(registry.list().map((entry) => entry.id)).toEqual([
      "knowledge.feature.ordering",
      "knowledge.vision.product",
    ]);
    expect(registry.relationships()).toHaveLength(1);
  });

  it("rejects duplicate artifacts and orphan relationships", () => {
    const registry = new KnowledgeRegistry();
    registry.add(artifact("knowledge.vision.product"));
    expect(() => registry.add(artifact("knowledge.vision.product"))).toThrow();
    expect(() =>
      registry.relate({
        from: "knowledge.vision.product",
        relation: "supports",
        to: "knowledge.missing.feature",
      }),
    ).toThrow();
  });
});
