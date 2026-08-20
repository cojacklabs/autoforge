import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  initializeProject,
  inspectInstallation,
} from "../src/commands/init.js";
import {
  createDoctrineSessionStore,
  DoctrineSessionService,
} from "../src/doctrine/session.js";
import { createDoctrineStore } from "../src/doctrine/store.js";
import { SessionRecoveryService } from "../src/guardrails/recovery.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const STARTED_AT = "2026-08-20T19:00:00.000Z";
const RECOVERED_AT = "2026-08-20T19:05:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-session-recovery-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({
    projectRoot,
    now: () => new Date(STARTED_AT),
    temporaryId: () => "init",
  });
  const workStore = createWorkStateStore(projectRoot);
  const sessionStore = createSessionStateStore(projectRoot);
  const issue = await new WorkService(workStore, {
    now: () => new Date(STARTED_AT),
  }).createIssue({
    name: "Recover state",
    description: "Repair interrupted session publication.",
    scope: { include: ["src/**"], exclude: [] },
  });
  return { issue: issue.entity, projectRoot, sessionStore, workStore };
}

async function activateWorkOnly(
  workStore: ReturnType<typeof createWorkStateStore>,
  issueId: string,
) {
  const { state } = await workStore.read();
  await workStore.write(
    {
      ...state.data,
      issues: state.data.issues.map((issue) =>
        issue.id === issueId
          ? { ...issue, status: "active", updatedAt: STARTED_AT }
          : issue,
      ),
      activeWork: {
        kind: "issue",
        id: issueId,
        startedAt: STARTED_AT,
      },
    },
    { expectedRevision: state.revision },
  );
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("session recovery service", () => {
  it("rebuilds missing work and doctrine sessions from active work", async () => {
    const { issue, projectRoot, workStore } = await createProject();
    await activateWorkOnly(workStore, issue.id);

    await expect(
      new SessionRecoveryService(projectRoot, {
        now: () => new Date(RECOVERED_AT),
        sessionId: () => "session.recovered",
      }).repair(),
    ).resolves.toEqual({
      status: "repaired",
      sessionId: "session.recovered",
      repairs: [
        "Rebuilt doctrine session session.recovered",
        "Rebuilt work session session.recovered",
      ],
    });
    await expect(inspectInstallation(projectRoot)).resolves.toMatchObject({
      status: "current",
      session: { data: { current: { id: "session.recovered" } } },
      doctrineSession: {
        data: { current: { sessionId: "session.recovered" } },
      },
    });
  });

  it("removes an orphan doctrine session when no work started", async () => {
    const { issue, projectRoot, workStore } = await createProject();
    const [{ state: doctrines }] = await Promise.all([
      createDoctrineStore(projectRoot).read(),
    ]);
    await new DoctrineSessionService(
      createDoctrineSessionStore(projectRoot),
      doctrines.data,
      (await workStore.read()).state.data,
      { now: () => new Date(RECOVERED_AT) },
    ).select({
      sessionId: "session.orphan",
      workKind: "issue",
      workId: issue.id,
    });

    await expect(
      new SessionRecoveryService(projectRoot).repair(),
    ).resolves.toEqual({
      status: "repaired",
      sessionId: null,
      repairs: ["Removed orphan doctrine session session.orphan"],
    });
    await expect(
      createDoctrineSessionStore(projectRoot).read(),
    ).resolves.toMatchObject({ state: { data: { current: null } } });
  });

  it("refuses to overwrite a session that conflicts with active work", async () => {
    const { issue, projectRoot, sessionStore, workStore } =
      await createProject();
    await activateWorkOnly(workStore, issue.id);
    const { state } = await sessionStore.read();
    await sessionStore.write(
      {
        ...state.data,
        current: {
          id: "session.conflict",
          status: "active",
          startedAt: STARTED_AT,
          endedAt: null,
          activeWork: {
            kind: "issue",
            id: "issue.different",
            startedAt: STARTED_AT,
          },
        },
      },
      { expectedRevision: state.revision },
    );

    await expect(
      new SessionRecoveryService(projectRoot).repair(),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
