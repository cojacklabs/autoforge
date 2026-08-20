import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createInitialDoctrineRegistry } from "../src/doctrine/builtins.js";
import {
  createDoctrineSessionStore,
  createInitialDoctrineSessionState,
  DoctrineSessionService,
  doctrineSessionStateSchema,
} from "../src/doctrine/session.js";
import { createInitialWorkState } from "../src/state/kernel.js";

const TIMESTAMP = "2026-08-20T11:00:00.000Z";
const END_TIMESTAMP = "2026-08-20T12:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-doctrine-session-"),
  );
  temporaryDirectories.push(projectRoot);
  const store = createDoctrineSessionStore(projectRoot, {
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
  await store.initialize(createInitialDoctrineSessionState());
  const work = createInitialWorkState();
  work.issues.push({
    id: "issue.secure-api",
    name: "Secure API",
    description: "Add backend authentication tests.",
    status: "planned",
    scope: { include: ["src/api/**"], exclude: [] },
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });
  return { projectRoot, store, work };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("doctrine session state", () => {
  it("requires ended history and unique selections", () => {
    expect(
      doctrineSessionStateSchema.safeParse({
        current: null,
        previous: [
          {
            sessionId: "session.invalid",
            workKind: "issue",
            workId: "issue.invalid",
            selectedAt: TIMESTAMP,
            endedAt: null,
            selections: [],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("doctrine session service", () => {
  it("persists explainable selections and ended history", async () => {
    const { store, work } = await createFixture();
    const service = new DoctrineSessionService(
      store,
      createInitialDoctrineRegistry(TIMESTAMP),
      work,
      { now: () => new Date(TIMESTAMP) },
    );

    const selected = await service.select({
      sessionId: "session.secure-api",
      workKind: "issue",
      workId: "issue.secure-api",
      paths: ["src/api/auth.ts"],
    });
    expect(selected.selections.map((item) => item.doctrineId)).toEqual([
      "doctrine.router",
      "doctrine.backend",
      "doctrine.testing",
      "doctrine.scope",
      "doctrine.security",
    ]);

    const ended = await new DoctrineSessionService(
      store,
      createInitialDoctrineRegistry(TIMESTAMP),
      work,
      { now: () => new Date(END_TIMESTAMP) },
    ).end("session.secure-api");
    expect(ended.endedAt).toBe(END_TIMESTAMP);
    await expect(store.read()).resolves.toMatchObject({
      state: {
        revision: 2,
        data: {
          current: null,
          previous: [{ sessionId: "session.secure-api" }],
        },
      },
    });
  });

  it("can compensate canceled and prematurely ended selections", async () => {
    const { store, work } = await createFixture();
    const service = new DoctrineSessionService(
      store,
      createInitialDoctrineRegistry(TIMESTAMP),
      work,
      { now: () => new Date(TIMESTAMP) },
    );
    await service.select({
      sessionId: "session.compensate",
      workKind: "issue",
      workId: "issue.secure-api",
    });
    await service.end("session.compensate");
    await service.resume("session.compensate");
    await expect(store.read()).resolves.toMatchObject({
      state: { data: { current: { sessionId: "session.compensate" } } },
    });
    await service.cancel("session.compensate");
    await expect(store.read()).resolves.toMatchObject({
      state: { data: { current: null, previous: [] } },
    });
  });
});
