import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { agentHandoffSchema } from "@cojacklabs/autoforge-protocol";
import { afterEach, describe, expect, it } from "vitest";

import { FileAgentHandoffRepository } from "../src/workflows/agent-handoff-store.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("cross-agent handoff continuity", () => {
  it("loads the Claude-to-Codex fixture without a raw transcript", async () => {
    const fixturePath = path.resolve(
      "test/fixtures/handoffs/claude-to-codex.json",
    );
    const raw = JSON.parse(await readFile(fixturePath, "utf8"));
    const handoff = agentHandoffSchema.parse(raw);
    expect(handoff.session).toEqual({
      id: "session.claude-planning",
      fromAgent: "claude",
      toAgent: "codex",
    });
    expect(handoff.nextAction).toContain("handoff schema");
    expect(raw).not.toHaveProperty("rawTranscript");
    expect(raw).not.toHaveProperty("messages");
  });

  it("persists canonical handoffs atomically in tracked project state", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-handoff-"),
    );
    temporaryDirectories.push(projectRoot);
    const repository = new FileAgentHandoffRepository(projectRoot);
    const fixture = agentHandoffSchema.parse(
      JSON.parse(
        await readFile("test/fixtures/handoffs/claude-to-codex.json", "utf8"),
      ),
    );

    const location = await repository.write(fixture);
    expect(path.relative(projectRoot, location)).toBe(
      ".autoforge/handoffs/handoff.claude-to-codex-v0-25.json",
    );
    await expect(repository.read(fixture.id)).resolves.toEqual(fixture);
    await expect(repository.list()).resolves.toEqual([fixture]);
  });
});
