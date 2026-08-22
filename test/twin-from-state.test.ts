import { describe, expect, it } from "vitest";
import { projectStateToTwin } from "../src/twin/from-state.js";

describe("project state digital twin adapter", () => {
  it("projects work hierarchy and decision relationships", () => {
    const result = projectStateToTwin({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      work: {
        features: [
          {
            id: "feature.search",
            name: "Search",
            description: "Search data",
            status: "planned",
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
        phases: [],
        tasks: [],
        issues: [],
        activeWork: null,
      },
      decisions: {
        decisions: [
          {
            id: "decision.search",
            statement: "Use indexed search",
            reasoning: "Fast results",
            consequences: ["Add an index"],
            scope: ["search"],
            keywords: ["index"],
            relatedWork: ["feature.search"],
            supersedes: null,
            status: "active",
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
      },
    });

    expect(result.nodes.map((node) => node.id)).toEqual([
      "decision.search",
      "feature.search",
    ]);
    expect(result.edges).toEqual([
      {
        sourceId: "decision.search",
        targetId: "feature.search",
        relationship: "informs",
      },
    ]);
  });
});
