import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createInitialSessionState,
  createInitialWorkState,
  createSessionStateStore,
  createWorkStateStore,
  sessionStateEnvelopeSchema,
  workStateEnvelopeSchema,
} from "../src/state/kernel.js";
import { STATE_SCHEMA_VERSION } from "../src/state/schemas.js";

const TIMESTAMP = "2026-08-19T23:30:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-kernel-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("kernel state persistence", () => {
  it("creates deterministic empty states", () => {
    expect(createInitialWorkState()).toEqual({
      features: [],
      phases: [],
      tasks: [],
      issues: [],
      activeWork: null,
    });
    expect(createInitialSessionState()).toEqual({
      current: null,
      previous: [],
    });
  });

  it("rejects unsupported envelope versions", () => {
    expect(
      workStateEnvelopeSchema.safeParse({
        schemaVersion: STATE_SCHEMA_VERSION + 1,
        revision: 0,
        updatedAt: TIMESTAMP,
        data: createInitialWorkState(),
      }).success,
    ).toBe(false);
    expect(
      sessionStateEnvelopeSchema.safeParse({
        schemaVersion: STATE_SCHEMA_VERSION + 1,
        revision: 0,
        updatedAt: TIMESTAMP,
        data: createInitialSessionState(),
      }).success,
    ).toBe(false);
  });

  it("persists work across independent store instances", async () => {
    const projectRoot = await createProject();
    const options = {
      now: () => new Date(TIMESTAMP),
      temporaryId: () => "test",
    };
    const store = createWorkStateStore(projectRoot, options);
    await store.initialize(createInitialWorkState());
    await store.write(
      {
        ...createInitialWorkState(),
        issues: [
          {
            id: "issue.persist-state",
            name: "Persist state",
            description: "Prove state survives store instances.",
            status: "ready",
            pauseReason: null,
            scope: { include: ["src/state/**"], exclude: [] },
            createdAt: TIMESTAMP,
            updatedAt: TIMESTAMP,
          },
        ],
      },
      { expectedRevision: 0 },
    );

    await expect(
      createWorkStateStore(projectRoot, options).read(),
    ).resolves.toMatchObject({
      source: "primary",
      state: {
        revision: 1,
        data: { issues: [{ id: "issue.persist-state" }] },
      },
    });
  });

  it("persists session state independently from work state", async () => {
    const projectRoot = await createProject();
    const options = {
      now: () => new Date(TIMESTAMP),
      temporaryId: () => "test",
    };
    const workStore = createWorkStateStore(projectRoot, options);
    const sessionStore = createSessionStateStore(projectRoot, options);
    await workStore.initialize(createInitialWorkState());
    await sessionStore.initialize(createInitialSessionState());

    await sessionStore.write(
      {
        current: {
          id: "session.persisted",
          status: "active",
          startedAt: TIMESTAMP,
          endedAt: null,
          activeWork: null,
        },
        previous: [],
      },
      { expectedRevision: 0 },
    );

    await expect(sessionStore.read()).resolves.toMatchObject({
      state: { revision: 1, data: { current: { id: "session.persisted" } } },
    });
    await expect(workStore.read()).resolves.toMatchObject({
      state: { revision: 0, data: { activeWork: null } },
    });
  });
});
