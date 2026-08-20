import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runRecapCommand } from "../src/commands/recap.js";
import { EXIT_CODE } from "../src/core/errors.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkLifecycleService } from "../src/work/lifecycle.js";
import { WorkService } from "../src/work/service.js";

const STARTED_AT = "2026-08-20T01:00:00.000Z";
const RECAP_AT = "2026-08-20T02:02:03.000Z";
const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-recap-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const workStore = createWorkStateStore(projectRoot);
  const sessionStore = createSessionStateStore(projectRoot);
  const creator = new WorkService(workStore, {
    now: () => new Date(STARTED_AT),
  });
  const issue = await creator.createIssue({
    name: "Recap command",
    description: "Verify recap presentation.",
    scope: {
      include: ["src/commands/recap.ts"],
      exclude: ["dist/**"],
    },
  });
  return { issue, projectRoot, sessionStore, workStore };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("recap command", () => {
  it("prints deterministic idle output", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runRecapCommand({ args: [], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(`AutoForge recap
Status: idle
Inventory: features=0 phases=0 tasks=0 issues=1
Actionable: planned=1 ready=0 active=0 blocked=0 completed=0 canceled=0
Active: none`);
  });

  it("prints active scope, session, and elapsed time", async () => {
    const { issue, projectRoot, sessionStore, workStore } =
      await createFixture();
    await new WorkLifecycleService(workStore, sessionStore, {
      now: () => new Date(STARTED_AT),
      sessionId: () => "session.recap-command",
    }).start({ kind: "issue", id: issue.entity.id });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runRecapCommand({
        args: [],
        output,
        startDirectory: projectRoot,
        now: () => new Date(RECAP_AT),
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Active: issue issue.recap-command — Recap command",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Scope include: src/commands/recap.ts",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain(
      "Session: session.recap-command",
    );
    expect(output.stdout.mock.calls[0]?.[0]).toContain("Elapsed: 1h 2m 3s");
  });

  it("rejects command arguments", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runRecapCommand({
        args: ["--json"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      'Command "recap" does not accept arguments.',
    );
  });
});
