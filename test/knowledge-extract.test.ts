import { describe, expect, it } from "vitest";
import { extractKnowledgeArtifacts } from "../src/knowledge/extract.js";

describe("knowledge extraction", () => {
  it("extracts typed artifacts from labeled input", () => {
    const artifacts = extractKnowledgeArtifacts(
      "Vision: A durable project memory\nFeature: Online ordering\nRisk: Scope growth",
      "brain-dump",
      new Date("2026-08-21T00:00:00.000Z"),
    );
    expect(artifacts.map((artifact) => artifact.kind)).toEqual([
      "vision",
      "feature",
      "risk",
    ]);
    expect(artifacts[1]?.id).toBe("knowledge.feature.online-ordering");
  });

  it("ignores unlabeled prose", () => {
    expect(
      extractKnowledgeArtifacts("A thought without a label", "chat"),
    ).toEqual([]);
  });
});
