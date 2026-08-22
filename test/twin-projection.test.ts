import { describe, expect, it } from "vitest";
import { buildTwinProjection } from "../src/twin/projection.js";

describe("digital twin projection", () => {
  it("deduplicates and deterministically orders nodes and edges", () => {
    const projection = buildTwinProjection({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      nodes: [
        {
          id: "feature.z",
          type: "feature",
          title: "Z",
          source: "work.json",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
        {
          id: "feature.a",
          type: "feature",
          title: "A",
          source: "work.json",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
        {
          id: "feature.a",
          type: "feature",
          title: "A duplicate",
          source: "work.json",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      edges: [
        {
          sourceId: "feature.z",
          targetId: "feature.a",
          relationship: "depends-on",
        },
        {
          sourceId: "feature.z",
          targetId: "feature.a",
          relationship: "depends-on",
        },
        {
          sourceId: "missing",
          targetId: "feature.a",
          relationship: "depends-on",
        },
      ],
    });

    expect(projection.nodes.map((node) => node.id)).toEqual([
      "feature.a",
      "feature.z",
    ]);
    expect(projection.edges).toEqual([
      {
        sourceId: "feature.z",
        targetId: "feature.a",
        relationship: "depends-on",
      },
    ]);
  });
});
