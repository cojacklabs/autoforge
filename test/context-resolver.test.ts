import { describe, expect, it } from "vitest";

import {
  CharacterTokenEstimator,
  type ContextTokenEstimator,
} from "../src/context/estimator.js";
import { ContextResolver } from "../src/context/resolver.js";
import { contextSelectionSchema } from "../src/context/schemas.js";
import { decisionMemorySchema } from "../src/decisions/schemas.js";
import { doctrineSessionStateSchema } from "../src/doctrine/session.js";
import { doctrineRegistrySchema } from "../src/doctrine/schemas.js";
import {
  specificationRelationshipEdgeSchema,
  specificationSchema,
  type Specification,
  type SpecificationRelationshipEdge,
} from "../src/specifications/schemas.js";
import { workStateSchema } from "../src/work/schemas.js";

const TIMESTAMP = "2026-08-20T14:00:00.000Z";

function workState() {
  return workStateSchema.parse({
    features: [
      {
        id: "feature.dashboard",
        name: "Operations Dashboard",
        description: "Deliver the operator experience.",
        status: "active",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    phases: [
      {
        id: "phase.dashboard-ui",
        featureId: "feature.dashboard",
        sequence: 1,
        name: "Dashboard UI",
        description: "Build the dashboard interface.",
        status: "active",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    tasks: [
      {
        id: "task.dashboard-cards",
        phaseId: "phase.dashboard-ui",
        name: "Build dashboard cards",
        description: "Implement the job summary interface.",
        status: "active",
        scope: { include: ["src/dashboard/**"], exclude: ["dist/**"] },
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    issues: [],
    activeWork: {
      kind: "task",
      id: "task.dashboard-cards",
      startedAt: TIMESTAMP,
    },
  });
}

function doctrines(content = "Coordinate relevant project context.") {
  return doctrineRegistrySchema.parse({
    doctrines: [
      {
        id: "doctrine.router",
        name: "router",
        title: "Router",
        summary: "Route project doctrine.",
        content,
        routing: {
          keywords: [],
          workKinds: [],
          scopeTags: [],
          pathPatterns: [],
        },
        source: "builtin",
        status: "active",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: "doctrine.frontend",
        name: "frontend",
        title: "Frontend",
        summary: "Build accessible interfaces.",
        content: "Use deterministic frontend implementation practices.",
        routing: {
          keywords: ["interface"],
          workKinds: ["task"],
          scopeTags: [],
          pathPatterns: ["src/dashboard/**"],
        },
        source: "builtin",
        status: "active",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: "doctrine.security",
        name: "security",
        title: "Security",
        summary: "Protect trust boundaries.",
        content: "Review authentication and authorization boundaries.",
        routing: {
          keywords: ["security"],
          workKinds: [],
          scopeTags: [],
          pathPatterns: [],
        },
        source: "builtin",
        status: "active",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
  });
}

function doctrineSessions() {
  return doctrineSessionStateSchema.parse({
    current: {
      sessionId: "session.dashboard",
      workKind: "task",
      workId: "task.dashboard-cards",
      selectedAt: TIMESTAMP,
      endedAt: null,
      selections: [
        {
          doctrineId: "doctrine.router",
          score: 1_000,
          reasons: [
            {
              signal: "router",
              value: "doctrine.router",
              weight: 1_000,
            },
          ],
        },
        {
          doctrineId: "doctrine.frontend",
          score: 70,
          reasons: [
            { signal: "work-kind", value: "task", weight: 20 },
            {
              signal: "path-pattern",
              value: "src/dashboard/**",
              weight: 40,
            },
            { signal: "keyword", value: "interface", weight: 10 },
          ],
        },
      ],
    },
    previous: [],
  });
}

function decisions() {
  return decisionMemorySchema.parse({
    decisions: [
      {
        id: "decision.card-boundaries",
        statement: "Keep dashboard cards independently composable.",
        reasoning: "The dashboard task requires reusable interface units.",
        consequences: ["Each card owns its loading state."],
        scope: ["frontend", "dashboard"],
        keywords: ["cards", "components"],
        relatedWork: ["task.dashboard-cards"],
        supersedes: null,
        status: "active",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: "decision.unrelated-database",
        statement: "Retain the quantum archive.",
        reasoning: "Quasar research depends on archival retention.",
        consequences: ["Astronomy records remain available."],
        scope: ["research"],
        keywords: ["quantum"],
        relatedWork: [],
        supersedes: null,
        status: "active",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      {
        id: "decision.revoked-layout",
        statement: "Use the retired layout system.",
        reasoning: "This choice is historical only.",
        consequences: ["Do not apply it."],
        scope: ["frontend"],
        keywords: ["layout"],
        relatedWork: ["task.dashboard-cards"],
        supersedes: null,
        status: "revoked",
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
  });
}

function specification(
  id: string,
  type: Specification["type"],
  overrides: Partial<Specification> = {},
): Specification {
  return specificationSchema.parse({
    id,
    type,
    name: id,
    description: `Specification for ${id}.`,
    relationships: {},
    tags: [type],
    source: "project",
    updatedAt: TIMESTAMP,
    content: `# ${id}`,
    ...overrides,
  });
}

function specificationRegistry() {
  const values = [
    specification("screen.dashboard", "screen", {
      name: "Operations dashboard",
      description: "The dashboard job summary screen.",
      tags: ["frontend", "dashboard"],
      relationships: {
        uses: ["component.status-tile", "token.spacing.compact"],
      },
    }),
    specification("component.status-tile", "component", {
      name: "Status tile",
      description: "A reusable visual unit.",
      tags: ["visual"],
    }),
    specification("flow.payment-review", "flow", {
      name: "Payment review",
      description: "Review a payment before submission.",
      tags: ["payments"],
    }),
    specification("architecture.warehouse", "architecture", {
      name: "Analytics warehouse",
      description: "Historical analytics storage.",
      tags: ["analytics"],
    }),
  ];
  const edges: SpecificationRelationshipEdge[] = [
    specificationRelationshipEdgeSchema.parse({
      sourceId: "screen.dashboard",
      relationship: "uses",
      targetId: "component.status-tile",
    }),
    specificationRelationshipEdgeSchema.parse({
      sourceId: "screen.dashboard",
      relationship: "uses",
      targetId: "token.spacing.compact",
    }),
  ];
  return {
    async list() {
      return values;
    },
    async findRelationships(id: string) {
      return edges.filter(
        (edge) => edge.sourceId === id || edge.targetId === id,
      );
    },
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    work: workState(),
    decisions: decisions(),
    doctrines: doctrines(),
    doctrineSessions: doctrineSessions(),
    specifications: specificationRegistry(),
    config: { contextBudget: { maxTokens: 12_000 } },
    ...overrides,
  };
}

describe("context token estimation", () => {
  it("uses a deterministic conservative character heuristic", () => {
    const estimator = new CharacterTokenEstimator();
    expect(estimator.estimate("")).toBe(1);
    expect(estimator.estimate("12345")).toBe(2);
    expect(estimator.estimate("12345")).toBe(2);
  });
});

describe("context resolver", () => {
  it("propagates active workflow metadata into the selection", async () => {
    const selection = await new ContextResolver().resolve(
      input({
        workflow: {
          kind: "feature-development",
          currentStage: "planning",
          status: "active",
          handoffIds: ["feature.checkout-research-to-planning"],
        },
      }),
    );
    expect(selection.workflow).toEqual({
      kind: "feature-development",
      currentStage: "planning",
      status: "active",
      handoffIds: ["feature.checkout-research-to-planning"],
    });
  });
  it("combines active work, routed doctrine, decisions, and related specs", async () => {
    const selection = await new ContextResolver().resolve(input());

    expect(selection.work).toMatchObject({
      kind: "task",
      item: { id: "task.dashboard-cards" },
      phase: { id: "phase.dashboard-ui" },
      feature: { id: "feature.dashboard" },
    });
    expect(selection.doctrines.map(({ doctrine }) => doctrine.id)).toEqual([
      "doctrine.router",
      "doctrine.frontend",
    ]);
    expect(selection.doctrines[1]?.reasons).toContain(
      "path-pattern: src/dashboard/** (+40)",
    );
    expect(selection.decisions.map(({ decision }) => decision.id)).toEqual([
      "decision.card-boundaries",
    ]);
    expect(
      selection.specs.map(({ specification }) => specification.id),
    ).toEqual(
      expect.arrayContaining(["screen.dashboard", "component.status-tile"]),
    );
    expect(
      selection.specs.find(
        ({ specification: value }) => value.id === "component.status-tile",
      )?.reasons,
    ).toEqual(
      expect.arrayContaining([expect.stringContaining("relationship")]),
    );
    expect(selection.exclusions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "token.spacing.compact",
          reason: "unresolved-reference",
        }),
        expect.objectContaining({
          id: "decision.revoked-layout",
          reason: "inactive",
        }),
        expect.objectContaining({
          id: "doctrine.security",
          reason: "not-relevant",
        }),
      ]),
    );
  });

  it("uses the supplemental task description as a ranking signal", async () => {
    const selection = await new ContextResolver().resolve(
      input({ taskDescription: "Review the payments submission flow." }),
    );

    expect(selection.work.objective).toContain("payments submission flow");
    expect(
      selection.specs.map(({ specification }) => specification.id),
    ).toContain("flow.payment-review");
  });

  it("selects intent and research knowledge by task signals and relationships", async () => {
    const base = specificationRegistry();
    const knowledge = [
      specification("intent.dashboard", "intent", {
        name: "Dashboard intent",
        description: "Clarify the dashboard job summary goal.",
        tags: ["dashboard", "intent"],
        relationships: { informs: ["screen.dashboard"] },
        knowledge: {
          kind: "intent",
          raw: "Improve the dashboard job summary.",
          objective: "Improve dashboard summaries.",
          requirements: ["Show job status"],
          assumptions: [],
          unknowns: [],
          constraints: [],
          acceptanceCriteria: [],
        },
      }),
      specification("research.dashboard", "research", {
        name: "Dashboard research",
        description: "Research dashboard summary patterns.",
        tags: ["dashboard", "research"],
        relationships: { informs: ["intent.dashboard"] },
        knowledge: {
          kind: "research",
          question: "Which summary pattern is clearest?",
          sources: [
            {
              type: "human",
              locator: "notes/dashboard.md",
              capturedAt: TIMESTAMP,
            },
          ],
          findings: ["Compact cards improve scanning."],
          alternatives: [],
        },
      }),
    ];
    const selection = await new ContextResolver().resolve(
      input({
        specifications: {
          async list() {
            return [...(await base.list()), ...knowledge];
          },
          findRelationships: base.findRelationships,
        },
      }),
    );
    expect(selection.specs.map(({ specification: value }) => value.id)).toEqual(
      expect.arrayContaining(["intent.dashboard", "research.dashboard"]),
    );
  });

  it("uses typed design metadata as a relevance signal", async () => {
    const responsive = specification("responsive.card-grid", "responsive", {
      name: "Layout contract",
      description: "Viewport behavior specification.",
      tags: ["layout"],
      design: {
        kind: "responsive",
        subject: "component.grid",
        rules: [
          {
            name: "compact",
            minWidth: 0,
            maxWidth: 767,
            behavior: "Dashboard cards collapse into a single column.",
          },
        ],
      },
      content: "Apply the selected viewport rule.",
    });
    const selection = await new ContextResolver().resolve(
      input({
        specifications: {
          async list() {
            return [responsive];
          },
          async findRelationships() {
            return [];
          },
        },
      }),
    );

    expect(selection.specs).toEqual([
      expect.objectContaining({
        specification: expect.objectContaining({ id: "responsive.card-grid" }),
        reasons: expect.arrayContaining([expect.stringContaining("design:")]),
      }),
    ]);
  });

  it("returns identical output for identical source snapshots", async () => {
    const resolver = new ContextResolver();
    const first = await resolver.resolve(input());
    const second = await resolver.resolve(input());

    expect(second).toEqual(first);
  });

  it("rejects selection payloads with inconsistent budget accounting", async () => {
    const selection = await new ContextResolver().resolve(input());

    expect(
      contextSelectionSchema.safeParse({
        ...selection,
        budget: {
          ...selection.budget,
          usedTokens: selection.budget.usedTokens + 1,
        },
      }).success,
    ).toBe(false);
  });

  it("excludes oversized candidates while admitting later smaller ones", async () => {
    class MarkerEstimator implements ContextTokenEstimator {
      estimate(content: string): number {
        return content.includes("OVERSIZED") ? 950 : 100;
      }
    }
    const selection = await new ContextResolver({
      estimator: new MarkerEstimator(),
    }).resolve(
      input({
        doctrines: doctrines("OVERSIZED doctrine content."),
        config: { contextBudget: { maxTokens: 1_000 } },
      }),
    );

    expect(selection.doctrines.map(({ doctrine }) => doctrine.id)).toEqual([
      "doctrine.frontend",
    ]);
    expect(selection.decisions).toHaveLength(1);
    expect(selection.specs.length).toBeGreaterThan(0);
    expect(selection.exclusions).toContainEqual(
      expect.objectContaining({
        id: "doctrine.router",
        reason: "budget-exceeded",
      }),
    );
    expect(selection.budget.exceeded).toBe(false);
    expect(selection.budget.usedTokens).toBeLessThanOrEqual(1_000);
  });

  it("retains mandatory work and reports an exceeded undersized budget", async () => {
    const estimator: ContextTokenEstimator = { estimate: () => 1_100 };
    const selection = await new ContextResolver({ estimator }).resolve(
      input({ config: { contextBudget: { maxTokens: 1_000 } } }),
    );

    expect(selection.work.item.id).toBe("task.dashboard-cards");
    expect(selection.doctrines).toEqual([]);
    expect(selection.decisions).toEqual([]);
    expect(selection.specs).toEqual([]);
    expect(selection.budget).toMatchObject({
      maxTokens: 1_000,
      usedTokens: 1_100,
      remainingTokens: 0,
      exceeded: true,
    });
  });

  it("fails closed without active work or a matching doctrine session", async () => {
    const inactive = workState();
    inactive.tasks[0]!.status = "ready";
    inactive.activeWork = null;
    await expect(
      new ContextResolver().resolve(input({ work: inactive })),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });

    await expect(
      new ContextResolver().resolve(
        input({
          doctrineSessions: doctrineSessionStateSchema.parse({
            current: null,
            previous: [],
          }),
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
