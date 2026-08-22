import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runContextCommand } from "../src/commands/context.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import {
  ContextPacketCompiler,
  contextPacketSchema,
  formatContextExplanation,
} from "../src/context/packet.js";
import { contextSelectionSchema } from "../src/context/schemas.js";
import { ContextPacketStore } from "../src/context/store.js";

const TIMESTAMP = "2026-08-20T16:00:00.000Z";
const temporaryDirectories: string[] = [];

function selection() {
  return contextSelectionSchema.parse({
    work: {
      kind: "issue",
      item: {
        id: "issue.packet-output",
        name: "Compile packet output",
        description: "Produce scoped context for an agent.",
        status: "active",
        scope: {
          include: ["src/context/**", "test/context-packet.test.ts"],
          exclude: ["dist/**"],
        },
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
      startedAt: TIMESTAMP,
      objective: "Compile a deterministic build packet.",
      reasons: ["active-work: issue.packet-output"],
      estimatedTokens: 20,
    },
    doctrines: [
      {
        doctrine: {
          id: "doctrine.router",
          name: "router",
          title: "Doctrine Router",
          summary: "Apply only selected project guidance.",
          content: "Keep context scoped to active work.",
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
        score: 1_000,
        reasons: ["router: doctrine.router (+1000)"],
        estimatedTokens: 30,
      },
    ],
    decisions: [
      {
        decision: {
          id: "decision.markdown-packets",
          statement: "Render build packets as Markdown.",
          reasoning: "Markdown is readable by humans and coding agents.",
          consequences: ["Packet artifacts remain inspectable."],
          scope: ["context"],
          keywords: ["markdown"],
          relatedWork: ["issue.packet-output"],
          supersedes: null,
          status: "active",
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
        score: 45,
        reasons: ["relatedWork: issue.packet-output"],
        estimatedTokens: 40,
      },
    ],
    specs: [
      {
        specification: {
          id: "architecture.context-plane",
          type: "architecture",
          name: "Context Plane",
          description: "The packet compiler architecture.",
          relationships: {
            uses: ["component.packet-store", "component.packet-compiler"],
            implements: ["design.context-contract"],
            "derived-from": ["intent.context-packet"],
          },
          tags: ["context", "architecture"],
          source: "project",
          updatedAt: TIMESTAMP,
          provenance: {
            sourceKind: "manual",
            capturedAt: TIMESTAMP,
          },
          knowledge: {
            kind: "architecture",
            summary: "Context is compiled from a bounded selection.",
            status: "active",
          },
          content: "The compiler consumes an immutable selection snapshot.",
        },
        score: 32,
        reasons: ["description: packet, compiler"],
        estimatedTokens: 50,
      },
    ],
    exclusions: [
      {
        kind: "specification",
        id: "screen.unrelated",
        reason: "not-relevant",
        details: ["No task signal matched"],
        estimatedTokens: 25,
      },
    ],
    budget: {
      maxTokens: 1_000,
      usedTokens: 140,
      remainingTokens: 860,
      exceeded: false,
    },
    workflow: {
      kind: "feature-development",
      currentStage: "planning",
      status: "active",
      handoffIds: ["feature.checkout-research-to-planning"],
    },
    contract: {
      agentId: "generic",
      requiredActions: ["Read the context packet."],
      prohibitedActions: ["Modify files outside scope."],
      validationCommands: ["npm test"],
    },
  });
}

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-context-packet-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({
    projectRoot,
    projectId: "68b2e470-e3ad-4b4c-b957-3e24cb89bd4b",
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "init",
  });
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("context packet compiler", () => {
  it("renders selected sources in a stable scoped Markdown structure", () => {
    const compiler = new ContextPacketCompiler();
    const packet = compiler.compile(selection());
    const repeated = compiler.compile(selection());

    expect(repeated).toEqual(packet);
    expect(packet).toMatchObject({
      id: "packet.issue.packet-output",
      workId: "issue.packet-output",
      format: "markdown",
      sourceTokens: 140,
      maxSourceTokens: 1_000,
      sourceBudgetExceeded: false,
    });
    expect(packet.content).toContain("# AutoForge Build Packet");
    expect(packet.content.indexOf("## Objective")).toBeLessThan(
      packet.content.indexOf("## Applicable Doctrines"),
    );
    expect(packet.content.indexOf("## Applicable Doctrines")).toBeLessThan(
      packet.content.indexOf("## Relevant Decisions"),
    );
    expect(packet.content.indexOf("## Relevant Decisions")).toBeLessThan(
      packet.content.indexOf("## Relevant Specifications"),
    );
    expect(packet.content).toContain("Keep context scoped to active work.");
    expect(packet.content).toContain("**Provenance:** manual");
    expect(packet.content).toContain("## Active Workflow");
    expect(packet.content).toContain("feature.checkout-research-to-planning");
    expect(packet.content).toContain("## Agent Contract");
    expect(packet.content).toContain("Modify files outside scope.");
    expect(packet.content).toContain("derived-from → `intent.context-packet`");
    expect(packet.content).toContain("Render build packets as Markdown.");
    expect(packet.content).toContain(
      "The compiler consumes an immutable selection snapshot.",
    );
    expect(packet.content).not.toContain("screen.unrelated");
    expect(packet.content.indexOf("implements →")).toBeLessThan(
      packet.content.indexOf("uses →"),
    );
    expect(packet.content.indexOf("component.packet-compiler")).toBeLessThan(
      packet.content.indexOf("component.packet-store"),
    );
  });

  it("renders typed design contracts without raw metadata concatenation", () => {
    const base = selection();
    const designSelection = contextSelectionSchema.parse({
      ...base,
      specs: [
        {
          ...base.specs[0],
          specification: {
            id: "responsive.packet-layout",
            type: "responsive",
            name: "Packet layout",
            description: "Responsive behavior for packet panels.",
            relationships: { "applies-to": ["component.packet-panel"] },
            tags: ["context", "responsive"],
            source: "manual:design-system",
            updatedAt: TIMESTAMP,
            design: {
              kind: "responsive",
              subject: "component.packet-panel",
              rules: [
                {
                  name: "compact",
                  minWidth: 0,
                  maxWidth: 767,
                  behavior: "Stack packet panels vertically.",
                },
              ],
            },
            content: "Preserve reading order at every viewport.",
          },
        },
      ],
    });

    const packet = new ContextPacketCompiler().compile(designSelection);

    expect(packet.content).toContain("**Design Contract:**");
    expect(packet.content).toContain("**Subject:** `component.packet-panel`");
    expect(packet.content).toContain(
      "`compact` (0px–767px): Stack packet panels vertically.",
    );
  });

  it("renders intent and research knowledge contracts", () => {
    const base = selection();
    const knowledgeSelection = contextSelectionSchema.parse({
      ...base,
      specs: [
        {
          ...base.specs[0],
          specification: {
            id: "research.checkout",
            type: "research",
            name: "Checkout research",
            description: "Provider research.",
            relationships: {},
            tags: ["research"],
            source: "manual",
            updatedAt: TIMESTAMP,
            knowledge: {
              kind: "research",
              question: "Which provider fits?",
              sources: [
                {
                  type: "human",
                  locator: "notes/checkout.md",
                  capturedAt: TIMESTAMP,
                },
              ],
              findings: ["Provider A supports the required region."],
              alternatives: [],
              recommendation: "Evaluate Provider A.",
              confidence: 0.8,
            },
            content: "Research summary.",
          },
        },
      ],
    });

    const packet = new ContextPacketCompiler().compile(knowledgeSelection);

    expect(packet.content).toContain("**Knowledge Contract:**");
    expect(packet.content).toContain("**Question:** Which provider fits?");
    expect(packet.content).toContain("**Sources:** 1");
  });

  it("formats selection evidence separately from packet content", () => {
    const selected = selection();
    const packet = new ContextPacketCompiler().compile(selected);
    const explanation = formatContextExplanation(selected, packet);
    expect(explanation).toContain("## Execution Contract");
    expect(explanation).toContain("generic");

    expect(packet.content).not.toContain("Context Selection Explanation");
    expect(explanation).toContain("# Context Selection Explanation");
    expect(explanation).toContain("router: doctrine.router (+1000)");
    expect(explanation).toContain("screen.unrelated");
    expect(explanation).toContain("not-relevant");
    expect(explanation).toContain("Rendered packet estimate");
  });

  it("rejects packet identities that do not match active work", () => {
    const packet = new ContextPacketCompiler().compile(selection());
    expect(
      contextPacketSchema.safeParse({ ...packet, id: "packet.issue.other" })
        .success,
    ).toBe(false);
  });
});

describe("context packet store", () => {
  it("atomically writes reproducible history and canonical context", async () => {
    const projectRoot = await createProject();
    const packet = new ContextPacketCompiler().compile(selection());
    const store = new ContextPacketStore(projectRoot, {
      temporaryId: () => "packet",
    });

    await expect(store.write(packet)).resolves.toEqual({
      currentPath: ".autoforge/context/current.md",
      packetPath: ".autoforge/context/packets/issue.packet-output.md",
    });
    const expected = `${packet.content}\n`;
    await expect(
      readFile(path.join(projectRoot, ".autoforge/context/current.md"), "utf8"),
    ).resolves.toBe(expected);
    await expect(
      readFile(
        path.join(
          projectRoot,
          ".autoforge/context/packets/issue.packet-output.md",
        ),
        "utf8",
      ),
    ).resolves.toBe(expected);
    await expect(store.write(packet)).resolves.toMatchObject({
      currentPath: ".autoforge/context/current.md",
    });
  });

  it("rejects a packet directory that resolves outside the project", async () => {
    const projectRoot = await createProject();
    const outside = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-context-packet-outside-"),
    );
    temporaryDirectories.push(outside);
    await mkdir(path.join(projectRoot, ".autoforge/context"), {
      recursive: true,
    });
    await symlink(
      outside,
      path.join(projectRoot, ".autoforge/context/packets"),
    );

    await expect(
      new ContextPacketStore(projectRoot).write(
        new ContextPacketCompiler().compile(selection()),
      ),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});

describe("context command", () => {
  it("rejects unsupported context options before project access", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runContextCommand({
        args: ["--unknown"],
        output,
        startDirectory: "/missing",
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      "Usage: autoforge context [--explain]",
    );
    expect(output.stdout).not.toHaveBeenCalled();
  });

  it("requires active work before generating an artifact", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runContextCommand({ args: [], output, startDirectory: projectRoot }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
    expect(output.stdout).not.toHaveBeenCalled();
  });
});
