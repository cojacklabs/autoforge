import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { AutoForgeError } from "../src/core/errors.js";
import { MigrationRegistry } from "../src/state/migrations.js";
import { createStateEnvelopeSchema } from "../src/state/schemas.js";
import { AtomicStateStore } from "../src/state/store.js";

const TIMESTAMPS = [
  "2026-08-19T22:00:00.000Z",
  "2026-08-19T22:01:00.000Z",
  "2026-08-19T22:02:00.000Z",
];
const FALLBACK_TIMESTAMP = "2026-08-19T22:03:00.000Z";
const temporaryDirectories: string[] = [];

const dataSchema = z.object({ value: z.string() }).strict();
const envelopeSchema = createStateEnvelopeSchema(dataSchema);

async function createStore() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-store-"));
  temporaryDirectories.push(directory);
  const timestamps = [...TIMESTAMPS];
  const store = new AtomicStateStore({
    filePath: path.join(directory, "state.json"),
    schema: envelopeSchema,
    schemaVersion: 1,
    now: () => new Date(timestamps.shift() ?? FALLBACK_TIMESTAMP),
    temporaryId: () => "test",
  });
  return { directory, store };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("atomic state store", () => {
  it("initializes revision zero and reads the primary state", async () => {
    const { store } = await createStore();

    await expect(store.initialize({ value: "initial" })).resolves.toMatchObject(
      {
        revision: 0,
        data: { value: "initial" },
      },
    );
    await expect(store.read()).resolves.toMatchObject({
      source: "primary",
      state: { revision: 0, data: { value: "initial" } },
    });
  });

  it("increments revisions and preserves the previous state as backup", async () => {
    const { store } = await createStore();
    await store.initialize({ value: "initial" });

    await expect(
      store.write({ value: "updated" }, { expectedRevision: 0 }),
    ).resolves.toMatchObject({
      revision: 1,
      data: { value: "updated" },
    });

    expect(JSON.parse(await readFile(store.backupPath, "utf8"))).toMatchObject({
      revision: 0,
      data: { value: "initial" },
    });
  });

  it("rejects stale revisions without replacing state", async () => {
    const { store } = await createStore();
    await store.initialize({ value: "initial" });
    await store.write({ value: "updated" }, { expectedRevision: 0 });

    await expect(
      store.write({ value: "stale" }, { expectedRevision: 0 }),
    ).rejects.toMatchObject({
      code: "STATE_CONFLICT",
      details: { expectedRevision: 0, actualRevision: 1 },
    });
    await expect(store.read()).resolves.toMatchObject({
      state: { revision: 1, data: { value: "updated" } },
    });
  });

  it("rejects a competing writer when the lock exists", async () => {
    const { store } = await createStore();
    await writeFile(store.lockPath, "another-process\n");

    await expect(store.initialize({ value: "initial" })).rejects.toMatchObject({
      code: "STATE_CONFLICT",
      details: { lockPath: store.lockPath },
    });
  });

  it("falls back to a valid backup and supports explicit recovery", async () => {
    const { store } = await createStore();
    await store.initialize({ value: "initial" });
    await store.write({ value: "updated" }, { expectedRevision: 0 });
    await writeFile(store.filePath, "{broken", "utf8");

    await expect(store.read()).resolves.toMatchObject({
      source: "backup",
      state: { revision: 0, data: { value: "initial" } },
    });
    await expect(store.recoverFromBackup()).resolves.toMatchObject({
      revision: 0,
      data: { value: "initial" },
    });
    await expect(store.read()).resolves.toMatchObject({ source: "primary" });
  });

  it("refuses invalid data before changing the primary state", async () => {
    const { store } = await createStore();
    await store.initialize({ value: "initial" });

    await expect(
      store.write({ value: 42 } as never, { expectedRevision: 0 }),
    ).rejects.toBeInstanceOf(AutoForgeError);
    await expect(store.read()).resolves.toMatchObject({
      state: { revision: 0, data: { value: "initial" } },
    });
  });

  it("removes temporary and lock files after successful writes", async () => {
    const { directory, store } = await createStore();
    await store.initialize({ value: "initial" });
    await store.write({ value: "updated" }, { expectedRevision: 0 });

    expect((await readdir(directory)).sort()).toEqual([
      "state.json",
      "state.json.bak",
    ]);
  });
});

describe("migration registry", () => {
  it("runs registered migrations sequentially", () => {
    const registry = new MigrationRegistry();
    registry.register({
      fromVersion: 1,
      toVersion: 2,
      migrate: (value) => ({ ...value, schemaVersion: 2, second: true }),
    });
    registry.register({
      fromVersion: 2,
      toVersion: 3,
      migrate: (value) => ({ ...value, schemaVersion: 3, third: true }),
    });

    expect(registry.migrate({ schemaVersion: 1 }, 3)).toEqual({
      schemaVersion: 3,
      second: true,
      third: true,
    });
  });

  it("rejects missing, duplicate, and non-sequential migrations", () => {
    const registry = new MigrationRegistry();
    registry.register({
      fromVersion: 1,
      toVersion: 2,
      migrate: (value) => ({ ...value, schemaVersion: 2 }),
    });

    expect(() => registry.migrate({ schemaVersion: 1 }, 3)).toThrowError(
      AutoForgeError,
    );
    expect(() =>
      registry.register({
        fromVersion: 1,
        toVersion: 2,
        migrate: (value) => value,
      }),
    ).toThrowError(AutoForgeError);
    expect(() =>
      registry.register({
        fromVersion: 3,
        toVersion: 5,
        migrate: (value) => value,
      }),
    ).toThrowError(AutoForgeError);
    expect(() =>
      registry.register({
        fromVersion: 0,
        toVersion: 1,
        migrate: (value) => value,
      }),
    ).toThrowError(AutoForgeError);
  });

  it("rejects migration output with the wrong version", () => {
    const registry = new MigrationRegistry();
    registry.register({
      fromVersion: 1,
      toVersion: 2,
      migrate: (value) => value,
    });

    expect(() => registry.migrate({ schemaVersion: 1 }, 2)).toThrowError(
      AutoForgeError,
    );
  });

  it("rejects an invalid migration target", () => {
    const registry = new MigrationRegistry();

    expect(() => registry.migrate({ schemaVersion: 1 }, 0)).toThrowError(
      AutoForgeError,
    );
    expect(() => registry.migrate({ schemaVersion: 1 }, 1.5)).toThrowError(
      AutoForgeError,
    );
  });
});
