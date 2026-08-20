import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AgentRegistry } from "../src/agents/registry.js";
import { GenericAgentAdapter } from "../src/agents/generic.js";
import { initializeProject } from "../src/commands/init.js";

const temporaryDirectories: string[] = [];

async function createProject(initialized = true): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-generic-agent-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  if (initialized) {
    await initializeProject({ projectRoot });
  }
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("generic agent adapter", () => {
  it("acts as a low-confidence initialized-project fallback", async () => {
    const projectRoot = await createProject();
    const adapter = new GenericAgentAdapter();

    await expect(adapter.detect({ projectRoot })).resolves.toMatchObject({
      detected: true,
      confidence: "low",
    });
    await expect(adapter.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "healthy",
    });
    await expect(
      new AgentRegistry([adapter]).resolve({ projectRoot }),
    ).resolves.toMatchObject({ adapter: { id: "generic" } });
  });

  it("reports unavailable rather than detecting an uninitialized project", async () => {
    const projectRoot = await createProject(false);
    const adapter = new GenericAgentAdapter();

    await expect(adapter.detect({ projectRoot })).resolves.toMatchObject({
      detected: false,
      confidence: "none",
    });
    await expect(adapter.healthCheck({ projectRoot })).resolves.toMatchObject({
      status: "unavailable",
      checks: expect.arrayContaining([
        expect.objectContaining({ id: "autoforge-config", status: "fail" }),
      ]),
    });
    await expect(
      adapter.deliverContext(
        { projectRoot },
        { id: "context.invalid", content: "No project", format: "text" },
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE", exitCode: 4 });
  });

  it("atomically delivers and replaces the canonical context", async () => {
    const projectRoot = await createProject();
    const adapter = new GenericAgentAdapter({ temporaryId: () => "test" });
    const context = { projectRoot };

    const first = await adapter.deliverContext(context, {
      id: "context.task-example",
      content: "# First packet",
      format: "markdown",
      estimatedTokens: 10,
    });
    expect(first).toEqual({
      status: "delivered",
      mode: "file",
      artifacts: [".autoforge/context/current.md"],
      message: null,
    });
    await adapter.deliverContext(context, {
      id: "context.task-example",
      content: "# Updated packet\n\nScoped guidance.",
      format: "markdown",
    });

    await expect(
      readFile(path.join(projectRoot, first.artifacts[0]!), "utf8"),
    ).resolves.toBe("# Updated packet\n\nScoped guidance.\n");
  });

  it("requires no agent-specific setup and claims no enforcement", async () => {
    const adapter = new GenericAgentAdapter();

    expect(adapter.capabilities).toEqual({
      setup: "none",
      contextDelivery: ["file"],
      enforcement: "none",
    });
    await expect(
      adapter.setup({ projectRoot: await createProject() }),
    ).resolves.toEqual({
      status: "already-configured",
      changes: [],
      instructions: null,
    });
  });
});
