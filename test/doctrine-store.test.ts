import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createInitialDoctrineRegistry } from "../src/doctrine/builtins.js";
import { INITIAL_DOCTRINE_NAMES } from "../src/doctrine/schemas.js";
import {
  createDoctrineStore,
  doctrineRegistryEnvelopeSchema,
  parseDoctrineRegistryEnvelope,
} from "../src/doctrine/store.js";
import { AutoForgeError } from "../src/core/errors.js";
import { STATE_SCHEMA_VERSION } from "../src/state/schemas.js";

const TIMESTAMP = "2026-08-20T08:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-doctrines-"),
  );
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

describe("initial doctrine registry", () => {
  it("creates all required compact built-in doctrines", () => {
    const registry = createInitialDoctrineRegistry(TIMESTAMP);

    expect(registry.doctrines.map((doctrine) => doctrine.name)).toEqual(
      INITIAL_DOCTRINE_NAMES,
    );
    expect(registry.doctrines).toHaveLength(10);
    expect(registry.doctrines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "doctrine.router",
          source: "builtin",
          status: "active",
          createdAt: TIMESTAMP,
        }),
        expect.objectContaining({ id: "doctrine.security" }),
      ]),
    );
  });
});

describe("doctrine registry persistence", () => {
  it("rejects unsupported versions with a structured error", () => {
    const value = {
      schemaVersion: STATE_SCHEMA_VERSION + 1,
      revision: 0,
      updatedAt: TIMESTAMP,
      data: createInitialDoctrineRegistry(TIMESTAMP),
    };

    expect(doctrineRegistryEnvelopeSchema.safeParse(value).success).toBe(false);
    expect(() => parseDoctrineRegistryEnvelope(value)).toThrowError(
      AutoForgeError,
    );
  });

  it("persists registry updates across store instances", async () => {
    const projectRoot = await createProject();
    const options = {
      now: () => new Date(TIMESTAMP),
      temporaryId: () => "test",
    };
    const store = createDoctrineStore(projectRoot, options);
    const initial = createInitialDoctrineRegistry(TIMESTAMP);
    await store.initialize(initial);
    await store.write(
      {
        doctrines: initial.doctrines.map((doctrine) =>
          doctrine.name === "frontend"
            ? { ...doctrine, status: "disabled" }
            : doctrine,
        ),
      },
      { expectedRevision: 0 },
    );

    const persisted = await createDoctrineStore(projectRoot, options).read();

    expect(persisted.state.revision).toBe(1);
    expect(persisted.state.data.doctrines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "frontend", status: "disabled" }),
      ]),
    );
  });
});
