import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { CodexAgentAdapter } from "../src/agents/codex.js";
import { GenericAgentAdapter } from "../src/agents/generic.js";
import { GrokAgentAdapter } from "../src/agents/grok.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-grok-agent-"),
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

describe("Grok Build agent adapter", () => {
  it("coexists with Codex instructions and preserves project guidance", async () => {
    const projectRoot = await createProject();
    const instructionsPath = path.join(projectRoot, "AGENTS.md");
    await writeFile(
      instructionsPath,
      "# Project Rules\n\nKeep this section.\n",
    );
    await new CodexAgentAdapter({ temporaryId: () => "codex" }).setup({
      projectRoot,
    });
    const adapter = new GrokAgentAdapter({ temporaryId: () => "grok" });

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
    expect(instructions).toContain("Keep this section.");
    expect(instructions.match(/autoforge:codex:start/g)).toHaveLength(1);
    expect(instructions.match(/autoforge:grok:start/g)).toHaveLength(1);
    expect(
      instructions.match(/\.autoforge\/context\/current\.md/g),
    ).toHaveLength(2);
  });

  it("delivers shared context and wins fallback resolution", async () => {
    const projectRoot = await createProject();
    const generic = new GenericAgentAdapter({ temporaryId: () => "generic" });
    const grok = new GrokAgentAdapter({ temporaryId: () => "grok" });
    await generic.deliverContext(
      { projectRoot },
      { id: "context.generic", content: "# Generic", format: "markdown" },
    );

    await expect(
      grok.deliverContext(
        { projectRoot },
        {
          id: "context.grok",
          content: "# Grok packet\n\nShared context.",
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
    ).resolves.toBe("# Grok packet\n\nShared context.\n");
    await expect(
      new AgentRegistry([generic, grok]).resolve({ projectRoot }),
    ).resolves.toMatchObject({
      adapter: { id: "grok" },
      detection: { confidence: "high" },
    });
    await expect(grok.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "healthy",
    });
  });

  it("detects native project configuration at low confidence", async () => {
    const projectRoot = await createProject();
    const adapter = new GrokAgentAdapter();
    await mkdir(path.join(projectRoot, ".grok"));
    await writeFile(path.join(projectRoot, ".grok/config.toml"), "\n");

    await expect(adapter.detect({ projectRoot })).resolves.toMatchObject({
      detected: true,
      confidence: "low",
      evidence: ["Project Grok configuration is present"],
    });
  });

  it("rejects malformed managed blocks and claims advisory enforcement", async () => {
    const projectRoot = await createProject();
    const adapter = new GrokAgentAdapter();
    await writeFile(
      path.join(projectRoot, "AGENTS.md"),
      "<!-- autoforge:grok:start -->\n",
    );

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
