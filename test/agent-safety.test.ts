import { access, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
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
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function createProject(initialized: boolean): Promise<string> {
  const projectRoot = await createDirectory("autoforge-agent-safety-");
  await mkdir(path.join(projectRoot, ".git"));
  if (initialized) {
    await initializeProject({ projectRoot });
  }
  return projectRoot;
}

async function exists(candidatePath: string): Promise<boolean> {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("agent adapter filesystem safety", () => {
  const concreteAdapters: Array<{
    name: string;
    create: () => AgentAdapter;
    artifacts: string[];
  }> = [
    {
      name: "Codex",
      create: () => new CodexAgentAdapter(),
      artifacts: ["AGENTS.md"],
    },
    {
      name: "Claude",
      create: () => new ClaudeAgentAdapter(),
      artifacts: ["CLAUDE.md"],
    },
    {
      name: "Gemini",
      create: () => new GeminiAgentAdapter(),
      artifacts: ["GEMINI.md", ".agents/rules/autoforge.md"],
    },
    {
      name: "Grok",
      create: () => new GrokAgentAdapter(),
      artifacts: ["AGENTS.md"],
    },
    {
      name: "Cursor",
      create: () => new CursorAgentAdapter(),
      artifacts: [".cursor/rules/autoforge-context.mdc"],
    },
  ];

  for (const adapter of concreteAdapters) {
    it(`leaves uninitialized projects untouched for ${adapter.name}`, async () => {
      const projectRoot = await createProject(false);

      await expect(
        adapter.create().deliverContext(
          { projectRoot },
          {
            id: "context.safety",
            content: "# Safety",
            format: "markdown",
          },
        ),
      ).rejects.toMatchObject({ code: "INVALID_STATE" });
      for (const artifact of adapter.artifacts) {
        await expect(exists(path.join(projectRoot, artifact))).resolves.toBe(
          false,
        );
      }
    });
  }

  it("rejects instruction paths that traverse a symlinked parent", async () => {
    const projectRoot = await createProject(true);
    const externalRoot = await createDirectory("autoforge-agent-external-");
    await symlink(externalRoot, path.join(projectRoot, ".cursor"), "dir");

    await expect(
      new CursorAgentAdapter().setup({ projectRoot }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    await expect(
      exists(path.join(externalRoot, "rules/autoforge-context.mdc")),
    ).resolves.toBe(false);
  });

  it("rejects canonical context paths outside the project", async () => {
    const projectRoot = await createProject(true);
    const externalRoot = await createDirectory("autoforge-context-external-");
    await symlink(
      externalRoot,
      path.join(projectRoot, ".autoforge/context"),
      "dir",
    );

    await expect(
      new GenericAgentAdapter().deliverContext(
        { projectRoot },
        {
          id: "context.safety",
          content: "# Safety",
          format: "markdown",
        },
      ),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    await expect(exists(path.join(externalRoot, "current.md"))).resolves.toBe(
      false,
    );
  });
});
