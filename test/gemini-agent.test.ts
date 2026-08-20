import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { GeminiAgentAdapter } from "../src/agents/gemini.js";
import { GenericAgentAdapter } from "../src/agents/generic.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-gemini-agent-"),
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

describe("Gemini and Antigravity agent adapter", () => {
  it("preserves native instructions while installing idempotent shims", async () => {
    const projectRoot = await createProject();
    await writeFile(
      path.join(projectRoot, "GEMINI.md"),
      "# Gemini Guidance\n\nKeep this section.\n",
    );
    await mkdir(path.join(projectRoot, ".agents/rules"), { recursive: true });
    await writeFile(
      path.join(projectRoot, ".agents/rules/autoforge.md"),
      "# Team Rule\n\nKeep this rule.\n",
    );
    const adapter = new GeminiAgentAdapter({ temporaryId: () => "test" });

    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "configured",
      changes: ["GEMINI.md", ".agents/rules/autoforge.md"],
      instructions: null,
    });
    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "already-configured",
      changes: [],
      instructions: null,
    });
    const geminiInstructions = await readFile(
      path.join(projectRoot, "GEMINI.md"),
      "utf8",
    );
    const antigravityRules = await readFile(
      path.join(projectRoot, ".agents/rules/autoforge.md"),
      "utf8",
    );
    expect(geminiInstructions).toContain("Keep this section.");
    expect(geminiInstructions).toContain("@./.autoforge/context/current.md");
    expect(antigravityRules).toContain("Keep this rule.");
    expect(antigravityRules).toContain(".autoforge/context/current.md");
  });

  it("delivers the shared artifact and wins fallback resolution", async () => {
    const projectRoot = await createProject();
    const generic = new GenericAgentAdapter({ temporaryId: () => "generic" });
    const gemini = new GeminiAgentAdapter({ temporaryId: () => "gemini" });
    await generic.deliverContext(
      { projectRoot },
      { id: "context.generic", content: "# Generic", format: "markdown" },
    );

    await expect(
      gemini.deliverContext(
        { projectRoot },
        {
          id: "context.gemini",
          content: "# Gemini packet\n\nShared context.",
          format: "markdown",
        },
      ),
    ).resolves.toEqual({
      status: "delivered",
      mode: "repository-instructions",
      artifacts: [
        "GEMINI.md",
        ".agents/rules/autoforge.md",
        ".autoforge/context/current.md",
      ],
      message: null,
    });
    await expect(
      readFile(path.join(projectRoot, ".autoforge/context/current.md"), "utf8"),
    ).resolves.toBe("# Gemini packet\n\nShared context.\n");
    await expect(
      new AgentRegistry([generic, gemini]).resolve({ projectRoot }),
    ).resolves.toMatchObject({
      adapter: { id: "gemini" },
      detection: { confidence: "high" },
    });
    await expect(gemini.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "healthy",
    });
  });

  it("detects either native product configuration at low confidence", async () => {
    const projectRoot = await createProject();
    const adapter = new GeminiAgentAdapter();
    await mkdir(path.join(projectRoot, ".gemini"));
    await writeFile(path.join(projectRoot, ".gemini/settings.json"), "{}\n");

    await expect(adapter.detect({ projectRoot })).resolves.toMatchObject({
      detected: true,
      confidence: "low",
      evidence: ["Project Gemini settings are present"],
    });
  });

  it("rejects either malformed shim and reports advisory capabilities", async () => {
    const projectRoot = await createProject();
    const adapter = new GeminiAgentAdapter();
    await mkdir(path.join(projectRoot, ".agents/rules"), { recursive: true });
    await writeFile(
      path.join(projectRoot, ".agents/rules/autoforge.md"),
      "<!-- autoforge:antigravity:start -->\n",
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
