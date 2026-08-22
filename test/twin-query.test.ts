import { describe, expect, it } from "vitest";
import { buildTwinProjection } from "../src/twin/projection.js";
import { queryTwin } from "../src/twin/query.js";

const projection = buildTwinProjection({
  projectId: "project.example",
  generatedAt: "2026-08-22T12:00:00.000Z",
  nodes: [
    {
      id: "feature.a",
      type: "feature",
      title: "A",
      source: "work.json",
      updatedAt: "2026-08-22T12:00:00.000Z",
    },
    {
      id: "decision.a",
      type: "decision",
      title: "Decision",
      source: "decisions.json",
      updatedAt: "2026-08-22T12:00:00.000Z",
    },
    {
      id: "test.a",
      type: "test",
      title: "Test",
      source: "test/a.ts",
      updatedAt: "2026-08-22T12:00:00.000Z",
    },
  ],
  edges: [
    {
      sourceId: "feature.a",
      targetId: "decision.a",
      relationship: "guided-by",
    },
    {
      sourceId: "decision.a",
      targetId: "test.a",
      relationship: "validated-by",
    },
  ],
});

describe("digital twin query", () => {
  it("filters by type and bounded depth", () => {
    const result = queryTwin(projection, {
      nodeTypes: ["feature"],
      maxDepth: 1,
    });
    expect(result.nodes.map((node) => node.id)).toEqual(["feature.a"]);
    expect(result.edges).toEqual([]);
  });

  it("filters relationships and applies result limits", () => {
    const result = queryTwin(projection, {
      relationship: "guided-by",
      limit: 1,
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toEqual([]);
  });
});
