import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AgentAdapter } from "../src/agents/adapter.js";
import { ClaudeAgentAdapter } from "../src/agents/claude.js";
import { CodexAgentAdapter } from "../src/agents/codex.js";
import { CursorAgentAdapter } from "../src/agents/cursor.js";
import { GeminiAgentAdapter } from "../src/agents/gemini.js";
import { GenericAgentAdapter } from "../src/agents/generic.js";
import { GrokAgentAdapter } from "../src/agents/grok.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-agent-coexistence-"),
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

describe("agent adapter coexistence", () => {
  it("keeps six adapters healthy around one canonical context", async () => {
    const projectRoot = await createProject();
    const adapters: AgentAdapter[] = [
      new GenericAgentAdapter({ temporaryId: () => "generic" }),
      new CodexAgentAdapter({ temporaryId: () => "codex" }),
      new ClaudeAgentAdapter({ temporaryId: () => "claude" }),
      new GeminiAgentAdapter({ temporaryId: () => "gemini" }),
      new GrokAgentAdapter({ temporaryId: () => "grok" }),
      new CursorAgentAdapter({ temporaryId: () => "cursor" }),
    ];
    for (const adapter of adapters) {
      await adapter.setup({ projectRoot });
    }
    await adapters[0]?.deliverContext(
      { projectRoot },
      {
        id: "context.coexistence",
        content: "# Shared adapter context",
        format: "markdown",
      },
    );

    await expect(
      readFile(path.join(projectRoot, ".autoforge/context/current.md"), "utf8"),
    ).resolves.toBe("# Shared adapter context\n");
    const health = await Promise.all(
      adapters.map((adapter) => adapter.healthCheck({ projectRoot })),
    );
    expect(health.map((result) => result.status)).toEqual(
      adapters.map(() => "healthy"),
    );
    const instructions = await readFile(
      path.join(projectRoot, "AGENTS.md"),
      "utf8",
    );
    expect(instructions.match(/autoforge:codex:start/g)).toHaveLength(1);
    expect(instructions.match(/autoforge:grok:start/g)).toHaveLength(1);

    const registry = new AgentRegistry(adapters);
    await expect(registry.resolve({ projectRoot })).resolves.toMatchObject({
      adapter: { id: "claude" },
      detection: { confidence: "high" },
    });
    for (const adapter of adapters) {
      await expect(
        registry.resolve({ projectRoot }, { preferredId: adapter.id }),
      ).resolves.toMatchObject({ adapter: { id: adapter.id } });
    }
  });
});
