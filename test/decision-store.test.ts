import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createDecisionStore,
  createInitialDecisionMemory,
  decisionMemoryEnvelopeSchema,
  parseDecisionMemoryEnvelope,
} from "../src/decisions/store.js";
import { AutoForgeError } from "../src/core/errors.js";
import { STATE_SCHEMA_VERSION } from "../src/state/schemas.js";

const TIMESTAMP = "2026-08-20T03:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-decisions-"),
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

describe("decision state persistence", () => {
  it("creates deterministic empty memory", () => {
    expect(createInitialDecisionMemory()).toEqual({ decisions: [] });
  });

  it("rejects unsupported versions with a structured state error", () => {
    const value = {
      schemaVersion: STATE_SCHEMA_VERSION + 1,
      revision: 0,
      updatedAt: TIMESTAMP,
      data: createInitialDecisionMemory(),
    };

    expect(decisionMemoryEnvelopeSchema.safeParse(value).success).toBe(false);
    expect(() => parseDecisionMemoryEnvelope(value)).toThrowError(
      AutoForgeError,
    );
  });

  it("persists decisions across independent store instances", async () => {
    const projectRoot = await createProject();
    const options = {
      now: () => new Date(TIMESTAMP),
      temporaryId: () => "test",
    };
    const store = createDecisionStore(projectRoot, options);
    await store.initialize(createInitialDecisionMemory());
    await store.write(
      {
        decisions: [
          {
            id: "decision.persist-memory",
            statement: "Persist decision memory.",
            reasoning: "Rationale must survive process boundaries.",
            consequences: ["Decision history becomes durable."],
            scope: ["decisions"],
            keywords: ["memory", "persistence"],
            relatedWork: ["feature.decision-memory"],
            supersedes: null,
            status: "active",
            kind: "architecture",
            createdAt: TIMESTAMP,
            updatedAt: TIMESTAMP,
          },
        ],
      },
      { expectedRevision: 0 },
    );

    await expect(
      createDecisionStore(projectRoot, options).read(),
    ).resolves.toMatchObject({
      source: "primary",
      state: {
        revision: 1,
        data: { decisions: [{ id: "decision.persist-memory" }] },
      },
    });
  });
});
