import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runPauseCommand } from "../src/commands/pause.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createInitialDoctrineRegistry } from "../src/doctrine/builtins.js";
import {
  createDoctrineSessionStore,
  DoctrineSessionService,
} from "../src/doctrine/session.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkLifecycleService } from "../src/work/lifecycle.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-pause-"));
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const workStore = createWorkStateStore(projectRoot);
  const sessionStore = createSessionStateStore(projectRoot);
  const issue = await new WorkService(workStore).createIssue({
    name: "Pause command",
    description: "Verify pause command wiring.",
    scope: { include: ["src/commands/pause.ts"], exclude: [] },
  });
  await new WorkLifecycleService(workStore, sessionStore, {
    sessionId: () => "session.pause-command",
  }).start({ kind: "issue", id: issue.entity.id });
  const doctrineSessionStore = createDoctrineSessionStore(projectRoot);
  await new DoctrineSessionService(
    doctrineSessionStore,
    createInitialDoctrineRegistry(new Date().toISOString()),
    (await workStore.read()).state.data,
  ).select({
    sessionId: "session.pause-command",
    workKind: "issue",
    workId: issue.entity.id,
  });
  return { doctrineSessionStore, issue, projectRoot, sessionStore, workStore };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("pause command", () => {
  it("pauses active work from a nested project directory", async () => {
    const {
      doctrineSessionStore,
      issue,
      projectRoot,
      sessionStore,
      workStore,
    } = await createFixture();
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPauseCommand({
        args: ["Waiting on account access."],
        output,
        startDirectory: nested,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      `Paused issue ${issue.entity.id}; ended session.pause-command.`,
    );
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          issues: [
            {
              id: issue.entity.id,
              status: "paused",
              pauseReason: "Waiting on account access.",
            },
          ],
          activeWork: null,
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: null,
          previous: [
            {
              id: "session.pause-command",
              status: "ended",
              activeWork: { kind: "issue", id: issue.entity.id },
            },
          ],
        },
      },
    });
    await expect(doctrineSessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: null,
          previous: [{ sessionId: "session.pause-command" }],
        },
      },
    });
  });

  it("rejects missing or blank reason", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPauseCommand({ args: [], output, startDirectory: process.cwd() }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      'Usage: autoforge pause "<reason>"',
    );

    await expect(
      runPauseCommand({
        args: ["   "],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("rejects extra arguments", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runPauseCommand({
        args: ["reason", "extra"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("preserves the lifecycle conflict when nothing is active", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    const { projectRoot } = await createFixture();
    await runPauseCommand({
      args: ["First pause."],
      output,
      startDirectory: projectRoot,
    });

    await expect(
      runPauseCommand({
        args: ["Second pause."],
        output: { stdout: vi.fn(), stderr: vi.fn() },
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });
});
