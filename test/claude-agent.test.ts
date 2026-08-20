import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ClaudeAgentAdapter } from "../src/agents/claude.js";
import { CodexAgentAdapter } from "../src/agents/codex.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { GenericAgentAdapter } from "../src/agents/generic.js";
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-claude-agent-"),
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

describe("Claude agent adapter", () => {
  it("preserves project-authored CLAUDE.md content with idempotent setup", async () => {
    const projectRoot = await createProject();
    const instructionsPath = path.join(projectRoot, "CLAUDE.md");
    await writeFile(
      instructionsPath,
      "# Team Guidance\n\nKeep this section.\n",
    );
    const adapter = new ClaudeAgentAdapter({ temporaryId: () => "test" });

    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "configured",
      changes: ["CLAUDE.md", ".claude/settings.json"],
      instructions: null,
    });
    await expect(adapter.setup({ projectRoot })).resolves.toEqual({
      status: "already-configured",
      changes: [],
      instructions: null,
    });
    const instructions = await readFile(instructionsPath, "utf8");
    expect(instructions).toContain("Keep this section.");
    expect(instructions).toContain(".autoforge/context/current.md");
    expect(instructions.match(/autoforge:claude:start/g)).toHaveLength(1);
    const settings = JSON.parse(
      await readFile(path.join(projectRoot, ".claude/settings.json"), "utf8"),
    );
    expect(settings).toMatchObject({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit|Write|NotebookEdit",
            hooks: [
              {
                type: "command",
                command: "autoforge check --hook claude",
              },
            ],
          },
        ],
      },
    });
  });

  it("shares canonical context with Generic and Codex adapters", async () => {
    const projectRoot = await createProject();
    const generic = new GenericAgentAdapter({ temporaryId: () => "generic" });
    const codex = new CodexAgentAdapter({ temporaryId: () => "codex" });
    const claude = new ClaudeAgentAdapter({ temporaryId: () => "claude" });
    await generic.deliverContext(
      { projectRoot },
      { id: "context.generic", content: "# Generic", format: "markdown" },
    );
    await codex.deliverContext(
      { projectRoot },
      { id: "context.codex", content: "# Codex", format: "markdown" },
    );

    await expect(
      claude.deliverContext(
        { projectRoot },
        {
          id: "context.claude",
          content: "# Claude packet\n\nShared context.",
          format: "markdown",
        },
      ),
    ).resolves.toEqual({
      status: "delivered",
      mode: "repository-instructions",
      artifacts: [
        "CLAUDE.md",
        ".claude/settings.json",
        ".autoforge/context/current.md",
      ],
      message: null,
    });
    await expect(
      readFile(path.join(projectRoot, ".autoforge/context/current.md"), "utf8"),
    ).resolves.toBe("# Claude packet\n\nShared context.\n");
    await expect(claude.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "healthy",
    });
  });

  it("detects native project configuration and outranks Generic after setup", async () => {
    const projectRoot = await createProject();
    const adapter = new ClaudeAgentAdapter({ temporaryId: () => "test" });
    await mkdir(path.join(projectRoot, ".claude"));
    await writeFile(path.join(projectRoot, ".claude", "settings.json"), "{}\n");

    await expect(adapter.detect({ projectRoot })).resolves.toMatchObject({
      detected: true,
      confidence: "low",
    });
    await adapter.setup({ projectRoot });
    await expect(
      new AgentRegistry([new GenericAgentAdapter(), adapter]).resolve({
        projectRoot,
      }),
    ).resolves.toMatchObject({
      adapter: { id: "claude" },
      detection: { confidence: "high" },
    });
  });

  it("preserves user settings and existing hooks while adding its guardrail", async () => {
    const projectRoot = await createProject();
    await mkdir(path.join(projectRoot, ".claude"));
    await writeFile(
      path.join(projectRoot, ".claude/settings.json"),
      `${JSON.stringify(
        {
          permissions: { allow: ["Read"] },
          hooks: {
            PreToolUse: [
              {
                matcher: "Bash",
                hooks: [{ type: "command", command: "echo existing" }],
              },
            ],
          },
        },
        null,
        2,
      )}\n`,
    );
    const adapter = new ClaudeAgentAdapter({ temporaryId: () => "test" });

    await adapter.setup({ projectRoot });
    const settings = JSON.parse(
      await readFile(path.join(projectRoot, ".claude/settings.json"), "utf8"),
    );
    expect(settings.permissions).toEqual({ allow: ["Read"] });
    expect(settings.hooks.PreToolUse).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ matcher: "Bash" }),
        expect.objectContaining({ matcher: "Edit|Write|NotebookEdit" }),
      ]),
    );
    await expect(adapter.setup({ projectRoot })).resolves.toMatchObject({
      status: "already-configured",
      changes: [],
    });
  });

  it("rejects malformed managed blocks and claims scoped hard enforcement", async () => {
    const projectRoot = await createProject();
    const adapter = new ClaudeAgentAdapter();
    await writeFile(
      path.join(projectRoot, "CLAUDE.md"),
      "<!-- autoforge:claude:start -->\n",
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
      enforcement: "hard",
    });
  });
});
