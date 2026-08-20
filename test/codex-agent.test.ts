import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { CodexAgentAdapter } from "../src/agents/codex.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { GenericAgentAdapter } from "../src/agents/generic.js";
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-codex-agent-"),
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

describe("Codex agent adapter", () => {
  it("merges an idempotent managed block without replacing project guidance", async () => {
    const projectRoot = await createProject();
    const instructionsPath = path.join(projectRoot, "AGENTS.md");
    await writeFile(
      instructionsPath,
      "# Project Rules\n\n- Preserve this rule.\n",
    );
    const adapter = new CodexAgentAdapter({ temporaryId: () => "test" });

    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "configured",
      changes: ["AGENTS.md"],
      instructions: null,
    });
    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "already-configured",
      changes: [],
      instructions: null,
    });
    const instructions = await readFile(instructionsPath, "utf8");
    expect(instructions).toContain("- Preserve this rule.");
    expect(instructions.match(/autoforge:codex:start/g)).toHaveLength(1);
  });

  it("delivers context through repository instructions and wins fallback resolution", async () => {
    const projectRoot = await createProject();
    const codex = new CodexAgentAdapter({ temporaryId: () => "test" });
    await new GenericAgentAdapter({
      temporaryId: () => "generic",
    }).deliverContext(
      { projectRoot },
      {
        id: "context.generic",
        content: "# Generic packet",
        format: "markdown",
      },
    );

    await expect(
      codex.deliverContext(
        { projectRoot },
        {
          id: "context.task-codex",
          content: "# Codex packet\n\nUse scoped guidance.",
          format: "markdown",
        },
      ),
    ).resolves.toEqual({
      status: "delivered",
      mode: "repository-instructions",
      artifacts: ["AGENTS.md", ".autoforge/context/current.md"],
      message: null,
    });
    await expect(
      readFile(path.join(projectRoot, ".autoforge/context/current.md"), "utf8"),
    ).resolves.toBe("# Codex packet\n\nUse scoped guidance.\n");
    await expect(
      new AgentRegistry([new GenericAgentAdapter(), codex]).resolve({
        projectRoot,
      }),
    ).resolves.toMatchObject({
      adapter: { id: "codex" },
      detection: { confidence: "high" },
    });
    await expect(codex.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "healthy",
    });
  });

  it("reports absent setup as degraded and malformed blocks as unavailable", async () => {
    const projectRoot = await createProject();
    const adapter = new CodexAgentAdapter();

    await expect(adapter.detect({ projectRoot })).resolves.toMatchObject({
      detected: false,
      confidence: "none",
    });
    await expect(adapter.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "degraded",
    });
    await writeFile(
      path.join(projectRoot, "AGENTS.md"),
      "<!-- autoforge:codex:start -->\n",
    );
    await expect(adapter.setup({ projectRoot })).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
    await expect(adapter.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "unavailable",
    });
  });

  it("advertises advisory repository-instruction delivery honestly", () => {
    expect(new CodexAgentAdapter().capabilities).toEqual({
      setup: "automatic",
      contextDelivery: ["repository-instructions", "file"],
      enforcement: "advisory",
    });
  });
});
