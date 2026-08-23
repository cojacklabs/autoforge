import { describe, expect, it } from "vitest";
import {
  twinEdgeSchema,
  twinNodeTypeSchema,
  twinProjectionSchema,
  twinQuerySchema,
} from "../src/twin/schemas.js";

describe("digital twin schemas", () => {
  it("validates bounded projections", () => {
    const projection = twinProjectionSchema.parse({
      schemaVersion: 1,
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      nodes: [
        {
          id: "feature.search",
          type: "feature",
          title: "Search",
          source: ".autoforge/state/work.json",
          updatedAt: "2026-08-22T12:00:00.000Z",
        },
      ],
      edges: [],
    });

    expect(projection.nodes).toHaveLength(1);
    expect(twinQuerySchema.parse({})).toMatchObject({
      maxDepth: 1,
      limit: 100,
    });
  });

  it("rejects self-referential edges and unbounded queries", () => {
    expect(() =>
      twinEdgeSchema.parse({
        sourceId: "feature.search",
        targetId: "feature.search",
        relationship: "implements",
      }),
    ).toThrow();
    expect(() => twinQuerySchema.parse({ maxDepth: 21 })).toThrow();
  });

  it("accepts hypothesis, experiment, and evidence node types", () => {
    expect(() => twinNodeTypeSchema.parse("hypothesis")).not.toThrow();
    expect(() => twinNodeTypeSchema.parse("experiment")).not.toThrow();
    expect(() => twinNodeTypeSchema.parse("evidence")).not.toThrow();
  });
});
