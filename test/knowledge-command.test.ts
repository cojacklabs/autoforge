import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runKnowledgeCommand } from "../src/commands/knowledge.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { SpecificationRegistry } from "../src/specifications/registry.js";
import { SpecificationFileStore } from "../src/specifications/store.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("knowledge command", () => {
  it("rejects malformed arguments", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runKnowledgeCommand({
        args: ["list", "--type", "architecture"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("lists and shows registered knowledge specifications", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-knowledge-command-"),
    );
    directories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    await new SpecificationRegistry(
      new SpecificationFileStore(projectRoot),
    ).register({
      id: "research.checkout",
      type: "research",
      name: "Checkout research",
      description: "Compare providers.",
      relationships: {},
      tags: ["payments"],
      source: "project",
      content: "# Checkout research",
      knowledge: {
        kind: "research",
        question: "Which provider?",
        sources: [
          {
            type: "human",
            explanation: "Interview",
            capturedAt: "2026-08-20T00:00:00.000Z",
          },
        ],
        findings: ["Provider A works."],
        alternatives: [],
        recommendation: "Provider A",
      },
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runKnowledgeCommand({
        args: ["list", "--type", "research"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "research.checkout [research]",
    );
    await expect(
      runKnowledgeCommand({
        args: ["show", "research.checkout"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[1]?.[0]).toContain("# Checkout research");
  });
});
