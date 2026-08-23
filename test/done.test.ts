import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDoneCommand } from "../src/commands/done.js";
import { initializeProject } from "../src/commands/init.js";
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
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-done-"));
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const workStore = createWorkStateStore(projectRoot);
  const sessionStore = createSessionStateStore(projectRoot);
  const issue = await new WorkService(workStore).createIssue({
    name: "Done command",
    description: "Verify completion command wiring.",
    scope: { include: ["src/commands/done.ts"], exclude: [] },
  });
  await new WorkLifecycleService(workStore, sessionStore, {
    sessionId: () => "session.done-command",
  }).start({ kind: "issue", id: issue.entity.id });
  const doctrineSessionStore = createDoctrineSessionStore(projectRoot);
  await new DoctrineSessionService(
    doctrineSessionStore,
    createInitialDoctrineRegistry(new Date().toISOString()),
    (await workStore.read()).state.data,
  ).select({
    sessionId: "session.done-command",
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

describe("done command", () => {
  it("completes work from a nested project directory", async () => {
    const {
      doctrineSessionStore,
      issue,
      projectRoot,
      sessionStore,
      workStore,
    } = await createFixture();
    const { createDecisionStore } = await import("../src/decisions/store.js");
    const { DecisionService } = await import("../src/decisions/service.js");
    await new DecisionService(
      createDecisionStore(projectRoot),
      workStore,
    ).record({
      statement: "Document the nested-directory done fixture.",
      reasoning: "Required by the documentation gate.",
      consequences: ["Recorded for test coverage."],
      scope: ["testing"],
      keywords: ["done-command"],
      relatedWork: [issue.entity.id],
    });
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoneCommand({ args: [], output, startDirectory: nested }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      `Completed issue ${issue.entity.id}; ended session.done-command.`,
    );
    await expect(workStore.read()).resolves.toMatchObject({
      state: {
        revision: 3,
        data: {
          issues: [{ id: issue.entity.id, status: "completed" }],
          activeWork: null,
        },
      },
    });
    await expect(sessionStore.read()).resolves.toMatchObject({
      state: {
        revision: 2,
        data: {
          current: null,
          previous: [
            {
              id: "session.done-command",
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
          previous: [{ sessionId: "session.done-command" }],
        },
      },
    });
  });

  it("rejects command arguments", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoneCommand({
        args: ["issue.done-command"],
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      'Command "done" only accepts --no-decision "<reason>", or no arguments.',
    );
  });

  it("preserves the lifecycle conflict when nothing is active", async () => {
    const { issue, projectRoot, workStore } = await createFixture();
    const { createDecisionStore } = await import("../src/decisions/store.js");
    const { DecisionService } = await import("../src/decisions/service.js");
    await new DecisionService(
      createDecisionStore(projectRoot),
      workStore,
    ).record({
      statement: "Document the lifecycle-conflict done fixture.",
      reasoning: "Required by the documentation gate.",
      consequences: ["Recorded for test coverage."],
      scope: ["testing"],
      keywords: ["done-command"],
      relatedWork: [issue.entity.id],
    });
    const firstOutput = { stdout: vi.fn(), stderr: vi.fn() };
    await runDoneCommand({
      args: [],
      output: firstOutput,
      startDirectory: projectRoot,
    });

    await expect(
      runDoneCommand({
        args: [],
        output: { stdout: vi.fn(), stderr: vi.fn() },
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  });

  it("blocks completion of an issue with no linked decision", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoneCommand({ args: [], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.invalidState);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining(
        "before closing this issue, or pass --no-decision",
      ),
    );
  });

  it("completes an issue with a linked decision", async () => {
    const { issue, projectRoot, workStore } = await createFixture();
    const { createDecisionStore } = await import("../src/decisions/store.js");
    const { DecisionService } = await import("../src/decisions/service.js");
    await new DecisionService(
      createDecisionStore(projectRoot),
      workStore,
    ).record({
      statement: "Document the done-command fixture.",
      reasoning: "Required by the documentation gate.",
      consequences: ["Recorded for test coverage."],
      scope: ["testing"],
      keywords: ["done-command"],
      relatedWork: [issue.entity.id],
      kind: "bugfix",
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoneCommand({ args: [], output, startDirectory: projectRoot }),
    ).resolves.toBe(EXIT_CODE.success);
  });

  it("bypasses the gate with --no-decision and records the reason", async () => {
    const { issue, projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDoneCommand({
        args: ["--no-decision", "Trivial fixture cleanup, no design decision."],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const { createDecisionStore } = await import("../src/decisions/store.js");
    const { state } = await createDecisionStore(projectRoot).read();
    const skipDecision = state.data.decisions.find(
      (decision) => decision.kind === "skip-reason",
    );
    expect(skipDecision).toBeDefined();
    expect(skipDecision?.relatedWork).toContain(issue.entity.id);
    expect(skipDecision?.reasoning).toContain(
      "Trivial fixture cleanup, no design decision.",
    );
  });
});
