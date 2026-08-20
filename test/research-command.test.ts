import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runResearchCommand } from "../src/commands/research.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("research command", () => {
  it("registers a research specification", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-research-command-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    await writeFile(
      path.join(projectRoot, "research.json"),
      JSON.stringify({
        id: "research.checkout",
        type: "research",
        name: "Checkout research",
        description: "Compare payment providers.",
        relationships: {},
        tags: ["payments"],
        source: "project",
        updatedAt: "2026-08-20T00:00:00.000Z",
        content: "# Checkout research",
        knowledge: {
          kind: "research",
          question: "Which provider should we use?",
          sources: [
            {
              type: "human",
              locator: "interview-1",
              explanation: "Product interview",
              capturedAt: "2026-08-20T00:00:00.000Z",
            },
          ],
          findings: ["Provider A supports cards."],
          alternatives: [],
          recommendation: "Provider A",
          confidence: 0.8,
        },
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runResearchCommand({
        args: ["register", "research.json"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("Registered research.checkout"),
    );
  });
});
