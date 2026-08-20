import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { CursorAgentAdapter } from "../src/agents/cursor.js";
import { GenericAgentAdapter } from "../src/agents/generic.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-cursor-agent-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("Cursor agent adapter", () => {
  it("preserves valid project rule content with idempotent setup", async () => {
    const projectRoot = await createProject();
    const rulePath = path.join(
      projectRoot,
      ".cursor/rules/autoforge-context.mdc",
    );
    await mkdir(path.dirname(rulePath), { recursive: true });
    await writeFile(
      rulePath,
      '---\ndescription: "Team context"\nalwaysApply: true\n---\n# Team Rule\n\nKeep this section.\n',
    );
    const adapter = new CursorAgentAdapter({ temporaryId: () => "test" });

    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "configured",
      changes: [".cursor/rules/autoforge-context.mdc"],
      instructions: null,
    });
    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "already-configured",
      changes: [],
      instructions: null,
    });
    const rule = await readFile(rulePath, "utf8");
    expect(rule).toContain("Keep this section.");
    expect(rule).toContain("@.autoforge/context/current.md");
    expect(rule.match(/autoforge:cursor:start/g)).toHaveLength(1);
  });

  it("delivers shared context and wins fallback resolution", async () => {
    const projectRoot = await createProject();
    const generic = new GenericAgentAdapter({ temporaryId: () => "generic" });
    const cursor = new CursorAgentAdapter({ temporaryId: () => "cursor" });
    await generic.deliverContext(
      { projectRoot },
      { id: "context.generic", content: "# Generic", format: "markdown" },
    );

    await expect(
      cursor.deliverContext(
        { projectRoot },
        {
          id: "context.cursor",
          content: "# Cursor packet\n\nShared context.",
          format: "markdown",
        },
      ),
    ).resolves.toEqual({
      status: "delivered",
      mode: "repository-instructions",
      artifacts: [
        ".cursor/rules/autoforge-context.mdc",
        ".autoforge/context/current.md",
      ],
      message: null,
    });
    await expect(
      readFile(path.join(projectRoot, ".autoforge/context/current.md"), "utf8"),
    ).resolves.toBe("# Cursor packet\n\nShared context.\n");
    await expect(
      new AgentRegistry([generic, cursor]).resolve({ projectRoot }),
    ).resolves.toMatchObject({
      adapter: { id: "cursor" },
      detection: { confidence: "high" },
    });
    await expect(cursor.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "healthy",
    });
  });

  it("detects native Cursor configuration at low confidence", async () => {
    const projectRoot = await createProject();
    const adapter = new CursorAgentAdapter();
    await mkdir(path.join(projectRoot, ".cursor"));
    await writeFile(path.join(projectRoot, ".cursor/mcp.json"), "{}\n");

    await expect(adapter.detect({ projectRoot })).resolves.toMatchObject({
      detected: true,
      confidence: "low",
      evidence: ["Project Cursor MCP configuration is present"],
    });
  });

  it("rejects an unsafe rule collision and claims advisory enforcement", async () => {
    const projectRoot = await createProject();
    const adapter = new CursorAgentAdapter();
    const rulePath = path.join(
      projectRoot,
      ".cursor/rules/autoforge-context.mdc",
    );
    await mkdir(path.dirname(rulePath), { recursive: true });
    await writeFile(rulePath, "# Existing file without frontmatter\n");

    await expect(adapter.setup({ projectRoot })).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
    await expect(adapter.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "unavailable",
    });
    expect(adapter.capabilities).toEqual({
      setup: "automatic",
      contextDelivery: ["repository-instructions", "file"],
      enforcement: "advisory",
    });
  });
});
