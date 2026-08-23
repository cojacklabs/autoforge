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

  it("projects specifications using their own type and relationship names", () => {
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
      specifications: [
        {
          id: "flow.checkout",
          type: "flow",
          name: "Checkout Flow",
          description: "Checkout flow spec.",
          relationships: { uses: ["screen.checkout"] },
          tags: [],
          source: "manual:example",
          updatedAt: "2026-08-22T12:00:00.000Z",
          content: "Checkout flow content.",
        },
        {
          id: "screen.checkout",
          type: "screen",
          name: "Checkout Screen",
          description: "Checkout screen spec.",
          relationships: {},
          tags: [],
          source: "manual:example",
          updatedAt: "2026-08-22T12:00:00.000Z",
          content: "Checkout screen content.",
        },
      ],
    });

    expect(result.nodes.find((node) => node.id === "flow.checkout")?.type).toBe(
      "flow",
    );
    expect(
      result.nodes.find((node) => node.id === "screen.checkout")?.type,
    ).toBe("screen");
    expect(result.edges).toContainEqual({
      sourceId: "flow.checkout",
      targetId: "screen.checkout",
      relationship: "uses",
    });
  });

  it("projects only active strategy assessments, with assesses and resulted-in edges", () => {
    const result = projectStateToTwin({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      work: {
        features: [
          {
            id: "feature.messaging",
            name: "Messaging",
            description: "Messaging feature.",
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
            id: "decision.strategic-assessment-recommends-backlog",
            statement:
              "feature.messaging: strategic assessment recommends backlog",
            reasoning: "High risk.",
            consequences: ["Deferred."],
            scope: ["strategy"],
            keywords: ["strategy", "backlog"],
            relatedWork: ["feature.messaging"],
            supersedes: null,
            status: "active",
            kind: "feature-note",
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
      },
      hypotheses: { hypotheses: [] },
      experiments: { experiments: [] },
      evidence: { evidence: [] },
      strategy: {
        assessments: [
          {
            id: "strategy.messaging-1",
            workId: "feature.messaging",
            factors: {
              alignment: "low",
              value: "uncertain",
              risk: "high",
              cost: "medium",
              evidenceStrength: "low",
              dependencyPressure: "low",
              complexity: "medium",
              releaseConstraint: "low",
            },
            decision: "backlog",
            rationale: "High spam risk.",
            evidenceIds: [],
            resultingDecision:
              "decision.strategic-assessment-recommends-backlog",
            supersedes: null,
            status: "superseded",
            createdAt: "2026-08-22T11:00:00.000Z",
            updatedAt: "2026-08-22T11:00:00.000Z",
          },
          {
            id: "strategy.messaging-2",
            workId: "feature.messaging",
            factors: {
              alignment: "high",
              value: "high",
              risk: "low",
              cost: "medium",
              evidenceStrength: "high",
              dependencyPressure: "low",
              complexity: "medium",
              releaseConstraint: "low",
            },
            decision: "now",
            rationale: "Risk resolved.",
            evidenceIds: [],
            resultingDecision:
              "decision.strategic-assessment-recommends-backlog",
            supersedes: "strategy.messaging-1",
            status: "active",
            createdAt: "2026-08-22T12:00:00.000Z",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
      },
    });

    expect(
      result.nodes.some((node) => node.id === "strategy.messaging-1"),
    ).toBe(false);
    expect(
      result.nodes.find((node) => node.id === "strategy.messaging-2")?.type,
    ).toBe("strategy");
    expect(result.edges).toContainEqual({
      sourceId: "strategy.messaging-2",
      targetId: "feature.messaging",
      relationship: "assesses",
    });
    expect(result.edges).toContainEqual({
      sourceId: "strategy.messaging-2",
      targetId: "decision.strategic-assessment-recommends-backlog",
      relationship: "resulted-in",
    });
  });

  it("projects traceability links only between already-modeled nodes", () => {
    const result = projectStateToTwin({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      work: {
        features: [
          {
            id: "feature.search",
            name: "Search",
            description: "Search feature.",
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
      traceability: {
        schemaVersion: 1,
        links: [
          {
            id: "trace.search-implements-story",
            sourceId: "feature.search",
            targetId: "story.search-onboarding",
            relationship: "implements",
            provenance: "manual",
            capturedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
      },
    });

    expect(
      result.edges.some((edge) => edge.sourceId === "feature.search"),
    ).toBe(false);
  });

  it("projects validation evidence with validates edges to work items", () => {
    const result = projectStateToTwin({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      work: {
        features: [
          {
            id: "feature.search",
            name: "Search",
            description: "Search feature.",
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
      validationEvidence: {
        schemaVersion: 1,
        evidence: [
          {
            id: "evidence.command.tests.123",
            gateId: "command.tests",
            status: "passed",
            severity: "required",
            workId: "feature.search",
            traceIds: [],
            reason: "Quality command tests exited with code 0.",
            capturedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
      },
    });

    expect(
      result.nodes.find((node) => node.id === "evidence.command.tests.123")
        ?.type,
    ).toBe("validation-evidence");
    expect(result.edges).toContainEqual({
      sourceId: "evidence.command.tests.123",
      targetId: "feature.search",
      relationship: "validates",
    });
  });
});
