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
            kind: "architecture",
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
      },
      hypotheses: { hypotheses: [] },
      experiments: { experiments: [] },
      evidence: { evidence: [] },
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

  it("projects hypotheses, experiments, and evidence as nodes with edges", () => {
    const hypothesis = {
      id: "hypothesis.example",
      statement: "Example hypothesis.",
      expectedOutcome: "Example outcome.",
      metric: "example",
      target: "example",
      linkedFeature: null,
      status: "proposed" as const,
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    };
    const experiment = {
      id: "experiment.example",
      hypothesisIds: [hypothesis.id],
      method: "A/B test",
      status: "planned" as const,
      startedAt: "2026-08-22T00:00:00.000Z",
      endedAt: null,
      createdAt: "2026-08-22T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    };
    const evidence = {
      id: "evidence.example",
      kind: "beta-feedback" as const,
      summary: "Example evidence.",
      source: "Example.",
      experimentId: experiment.id,
      hypothesisId: null,
      relatedWork: null,
      resultingDecision: null,
      capturedAt: "2026-08-22T00:00:00.000Z",
    };

    const projection = projectStateToTwin({
      projectId: "test-project",
      generatedAt: "2026-08-22T00:00:00.000Z",
      work: {
        features: [],
        phases: [],
        tasks: [],
        issues: [],
        activeWork: null,
      },
      decisions: { decisions: [] },
      hypotheses: { hypotheses: [hypothesis] },
      experiments: { experiments: [experiment] },
      evidence: { evidence: [evidence] },
    });

    expect(
      projection.nodes.find((node) => node.id === hypothesis.id)?.type,
    ).toBe("hypothesis");
    expect(
      projection.nodes.find((node) => node.id === experiment.id)?.type,
    ).toBe("experiment");
    expect(projection.nodes.find((node) => node.id === evidence.id)?.type).toBe(
      "evidence",
    );
    expect(projection.edges).toContainEqual({
      sourceId: experiment.id,
      targetId: hypothesis.id,
      relationship: "tests",
    });
    expect(projection.edges).toContainEqual({
      sourceId: evidence.id,
      targetId: experiment.id,
      relationship: "produced-by",
    });
  });

  it("projects phases, tasks, and issues with their own dedicated node types", () => {
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
        phases: [
          {
            id: "phase.index",
            featureId: "feature.search",
            sequence: 1,
            name: "Index",
            description: "Build the index.",
            status: "planned",
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
        tasks: [
          {
            id: "task.build-index",
            phaseId: "phase.index",
            name: "Build index",
            description: "Build the search index.",
            status: "planned",
            scope: { include: ["src/search/**"], exclude: [] },
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
        issues: [
          {
            id: "issue.slow-index",
            name: "Slow index",
            description: "Indexing is slow.",
            status: "planned",
            scope: { include: ["src/search/**"], exclude: [] },
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
        activeWork: null,
      },
      decisions: { decisions: [] },
      hypotheses: { hypotheses: [] },
      experiments: { experiments: [] },
      evidence: { evidence: [] },
    });

    expect(result.nodes.find((node) => node.id === "phase.index")?.type).toBe(
      "phase",
    );
    expect(
      result.nodes.find((node) => node.id === "task.build-index")?.type,
    ).toBe("task");
    expect(
      result.nodes.find((node) => node.id === "issue.slow-index")?.type,
    ).toBe("issue");
  });

  it("projects constitution rules with governs edges to matching work items", () => {
    const result = projectStateToTwin({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      work: {
        features: [
          {
            id: "feature.billing",
            name: "Billing",
            description: "Billing feature.",
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
      decisions: { decisions: [] },
      hypotheses: { hypotheses: [] },
      experiments: { experiments: [] },
      evidence: { evidence: [] },
      constitution: {
        id: "constitution.default",
        name: "Default Constitution",
        purpose: "Govern this project.",
        rules: [
          {
            id: "constitution.billing-scope",
            title: "Billing is out of scope for Release A",
            statement: "Billing work must not ship in Release A.",
            level: "MUST_NOT",
            enforcement: "hard",
            scope: {
              paths: [],
              workKinds: ["feature"],
              releases: [],
              tags: [],
            },
            rationale: "Release A does not include payments.",
            nonGoals: [],
          },
        ],
        source: ".autoforge/governance/constitution.json",
        updatedAt: "2026-08-22T12:00:00.000Z",
      },
    });

    expect(
      result.nodes.find((node) => node.id === "constitution.billing-scope")
        ?.type,
    ).toBe("constitution");
    expect(result.edges).toContainEqual({
      sourceId: "constitution.billing-scope",
      targetId: "feature.billing",
      relationship: "governs",
    });
  });

  it("projects domain concepts, their relationships, and provenance edges", () => {
    const result = projectStateToTwin({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      work: {
        features: [],
        phases: [],
        tasks: [],
        issues: [],
        activeWork: null,
      },
      decisions: {
        decisions: [
          {
            id: "decision.resume-canonical",
            statement: "A user has one canonical active resume.",
            reasoning: "Simplifies matching.",
            consequences: ["Resume history is immutable."],
            scope: ["domain"],
            keywords: ["resume"],
            relatedWork: [],
            supersedes: null,
            status: "active",
            kind: "architecture",
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
      },
      hypotheses: { hypotheses: [] },
      experiments: { experiments: [] },
      evidence: { evidence: [] },
      domain: {
        id: "domain-artifact.default",
        concepts: [
          {
            id: "domain.user",
            name: "User",
            description: "A person with an account.",
            aliases: [],
            lifecycle: "confirmed",
            provenance: [],
            metadata: {},
          },
          {
            id: "domain.resume",
            name: "Resume",
            description: "A user's canonical resume.",
            aliases: [],
            lifecycle: "confirmed",
            provenance: [
              {
                sourceType: "decision",
                sourceId: "decision.resume-canonical",
                capturedAt: "2026-08-22T12:00:00.000Z",
              },
            ],
            metadata: {},
          },
        ],
        relationships: [
          {
            id: "domain-relation.user-owns-resume",
            sourceId: "domain.user",
            targetId: "domain.resume",
            type: "owns",
            rationale: "A user owns their resume.",
            lifecycle: "confirmed",
            provenance: [],
          },
        ],
        invariants: [],
        updatedAt: "2026-08-22T12:00:00.000Z",
      },
    });

    expect(result.nodes.find((node) => node.id === "domain.user")?.type).toBe(
      "domain",
    );
    expect(result.edges).toContainEqual({
      sourceId: "domain.user",
      targetId: "domain.resume",
      relationship: "owns",
    });
    expect(result.edges).toContainEqual({
      sourceId: "domain.resume",
      targetId: "decision.resume-canonical",
      relationship: "models",
    });
  });

  it("omits constitution and domain nodes when neither is provided", () => {
    const result = projectStateToTwin({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      work: {
        features: [],
        phases: [],
        tasks: [],
        issues: [],
        activeWork: null,
      },
      decisions: { decisions: [] },
      hypotheses: { hypotheses: [] },
      experiments: { experiments: [] },
      evidence: { evidence: [] },
    });

    expect(result.nodes.some((node) => node.type === "constitution")).toBe(
      false,
    );
    expect(result.nodes.some((node) => node.type === "domain")).toBe(false);
  });
});
