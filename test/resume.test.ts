import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runPauseCommand } from "../src/commands/pause.js";
import { runResumeCommand } from "../src/commands/resume.js";
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

async function createPausedFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-resume-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const workStore = createWorkStateStore(projectRoot);
  const sessionStore = createSessionStateStore(projectRoot);
  const issue = await new WorkService(workStore).createIssue({
    name: "Resume command",
    description: "Verify resume command wiring.",
    scope: { include: ["src/commands/resume.ts"], exclude: [] },
  });
  await new WorkLifecycleService(workStore, sessionStore, {
    sessionId: () => "session.resume-setup",
  }).start({ kind: "issue", id: issue.entity.id });
  const doctrineSessionStore = createDoctrineSessionStore(projectRoot);
  await new DoctrineSessionService(
    doctrineSessionStore,
    createInitialDoctrineRegistry(new Date().toISOString()),
    (await workStore.read()).state.data,
  ).select({
    sessionId: "session.resume-setup",
    workKind: "issue",
    workId: issue.entity.id,
  });
  await runPauseCommand({
    args: ["Waiting on account access."],
    output: { stdout: vi.fn(), stderr: vi.fn() },
    startDirectory: projectRoot,
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

describe("resume command", () => {
  it("resumes a paused issue from a nested project directory", async () => {
    const { issue, projectRoot, sessionStore, workStore } =
      await createPausedFixture();
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runResumeCommand({
        args: ["issue", issue.entity.id],
        output,
        startDirectory: nested,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `^Resumed issue ${issue.entity.id} in session\\.[a-f0-9-]+\\.$`,
        ),
      ),
    );
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        data: {
          issues: [
            { id: issue.entity.id, status: "active", pauseReason: null },
          ],
          activeWork: { kind: "issue", id: issue.entity.id },
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        data: {
          current: {
            status: "active",
            activeWork: { kind: "issue", id: issue.entity.id },
          },
        },
      },
    });
    const doctrineSession =
      await createDoctrineSessionStore(projectRoot).read();
    expect(doctrineSession.state.data.current).toMatchObject({
      workKind: "issue",
      workId: issue.entity.id,
    });
  });

  it.each([
    { args: [] },
    { args: ["feature", "feature.invalid"] },
    { args: ["task"] },
    { args: ["task", "task.id", "extra"] },
  ])("rejects invalid arguments: $args", async ({ args }) => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runResumeCommand({ args, output, startDirectory: process.cwd() }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      "Usage: autoforge resume <task|issue> <id>",
    );
  });

  it("rejects resuming an issue that is not paused", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-resume-not-paused-"),
    );
    temporaryDirectories.push(projectRoot);
    await mkdir(path.join(projectRoot, ".git"));
    await initializeProject({ projectRoot });
    const workStore = createWorkStateStore(projectRoot);
    const issue = await new WorkService(workStore).createIssue({
      name: "Not paused",
      description: "Never started.",
      scope: { include: ["src/**"], exclude: [] },
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runResumeCommand({
        args: ["issue", issue.entity.id],
        output,
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });

  it("rejects resuming while another item is already active", async () => {
    const { issue, projectRoot, workStore } = await createPausedFixture();
    const otherIssue = await new WorkService(workStore).createIssue({
      name: "Other active work",
      description: "Occupies activeWork while the first issue is paused.",
      scope: { include: ["src/**"], exclude: [] },
    });
    const sessionStore = createSessionStateStore(projectRoot);
    await new WorkLifecycleService(workStore, sessionStore, {
      sessionId: () => "session.other-active",
    }).start({ kind: "issue", id: otherIssue.entity.id });

    await expect(
      runResumeCommand({
        args: ["issue", issue.entity.id],
        output: { stdout: vi.fn(), stderr: vi.fn() },
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });
});
