import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { SpecificationRegistry } from "../src/specifications/registry.js";
import { SpecificationFileStore } from "../src/specifications/store.js";

const TIMESTAMP = "2026-08-20T12:00:00.000Z";
const temporaryDirectories: string[] = [];
let projectRoot: string;

beforeEach(async () => {
  projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-spec-registry-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
});

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function createRegistry() {
  return new SpecificationRegistry(
    new SpecificationFileStore(projectRoot, { temporaryId: () => "test" }),
    { now: () => new Date(TIMESTAMP) },
  );
}

function input(
  id: string,
  type: "architecture" | "screen" | "component" | "flow" | "design",
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    type,
    name: id,
    description: `Description for ${id}.`,
    relationships: {},
    tags: [type],
    source: "project",
    content: `# ${id}`,
    ...overrides,
  };
}

describe("specification registry", () => {
  it("registers and reads timestamped specifications", async () => {
    const registry = createRegistry();

    await expect(
      registry.register(input("architecture.system", "architecture")),
    ).resolves.toMatchObject({
      specification: {
        id: "architecture.system",
        updatedAt: TIMESTAMP,
      },
      path: ".autoforge/specifications/architecture/system.md",
    });
    await expect(registry.read("architecture.system")).resolves.toMatchObject({
      id: "architecture.system",
      content: "# architecture.system",
    });
  });

  it("lists deterministically with type, tag, and source filters", async () => {
    const registry = createRegistry();
    await registry.register(
      input("screen.dashboard", "screen", {
        tags: ["frontend", "dashboard"],
        source: "figma",
      }),
    );
    await registry.register(
      input("component.job-card", "component", {
        tags: ["frontend", "jobs"],
        source: "project",
      }),
    );
    await registry.register(input("flow.checkout", "flow"));

    await expect(registry.list()).resolves.toMatchObject([
      { id: "component.job-card" },
      { id: "flow.checkout" },
      { id: "screen.dashboard" },
    ]);
    await expect(
      registry.list({ types: ["screen", "component"], tags: ["frontend"] }),
    ).resolves.toHaveLength(2);
    await expect(registry.list({ source: "figma" })).resolves.toMatchObject([
      { id: "screen.dashboard" },
    ]);
  });

  it("finds deterministic incoming and outgoing relationships", async () => {
    const registry = createRegistry();
    await registry.register(input("architecture.system", "architecture"));
    await registry.register(
      input("screen.dashboard", "screen", {
        relationships: {
          implements: ["architecture.system"],
          uses: ["component.job-card", "token.spacing.md"],
        },
      }),
    );
    await registry.register(
      input("component.job-card", "component", {
        relationships: { implements: ["architecture.system"] },
      }),
    );

    await expect(
      registry.findRelationships("screen.dashboard", {
        direction: "outgoing",
      }),
    ).resolves.toEqual([
      {
        sourceId: "screen.dashboard",
        relationship: "implements",
        targetId: "architecture.system",
      },
      {
        sourceId: "screen.dashboard",
        relationship: "uses",
        targetId: "component.job-card",
      },
      {
        sourceId: "screen.dashboard",
        relationship: "uses",
        targetId: "token.spacing.md",
      },
    ]);
    await expect(
      registry.findRelationships("architecture.system", {
        direction: "incoming",
        relationships: ["implements"],
      }),
    ).resolves.toEqual([
      {
        sourceId: "component.job-card",
        relationship: "implements",
        targetId: "architecture.system",
      },
      {
        sourceId: "screen.dashboard",
        relationship: "implements",
        targetId: "architecture.system",
      },
    ]);
    await expect(
      registry.findRelationships("component.job-card"),
    ).resolves.toEqual([
      {
        sourceId: "component.job-card",
        relationship: "implements",
        targetId: "architecture.system",
      },
      {
        sourceId: "screen.dashboard",
        relationship: "uses",
        targetId: "component.job-card",
      },
    ]);
  });

  it("rejects invalid registration, filters, and unknown anchors", async () => {
    const registry = createRegistry();
    await expect(
      registry.register(input("screen.wrong", "component")),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    await registry.register(input("screen.dashboard", "screen"));
    await expect(
      registry.findRelationships("screen.dashboard", {
        relationships: ["Not Valid"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    await expect(
      registry.findRelationships("design.missing"),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});
