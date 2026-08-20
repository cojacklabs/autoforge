import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONTEXT_BUDGET_TOKENS,
  createDefaultConfig,
  parseConfig,
} from "../src/core/config.js";
import { AutoForgeError, EXIT_CODE } from "../src/core/errors.js";
import {
  STATE_SCHEMA_VERSION,
  createProjectMetadataEnvelope,
  createStateEnvelopeSchema,
  parseProjectMetadataEnvelope,
  parseStateEnvelope,
} from "../src/state/schemas.js";

const PROJECT_ID = "f45b8e3d-e9d8-465b-8489-3bc5e5e5a4dd";
const TIMESTAMP = "2026-08-19T21:30:00.000Z";

describe("foundation config schema", () => {
  it("creates deterministic defaults", () => {
    expect(createDefaultConfig(PROJECT_ID)).toEqual({
      schemaVersion: CONFIG_SCHEMA_VERSION,
      projectId: PROJECT_ID,
      contextBudget: {
        maxTokens: DEFAULT_CONTEXT_BUDGET_TOKENS,
      },
      qualityGates: [],
      artifacts: {
        work: "tracked",
        decisions: "tracked",
        doctrines: "tracked",
        specifications: "tracked",
        sessions: "ignored",
        packets: "ignored",
      },
    });
  });

  it("accepts an optional default agent", () => {
    const config = createDefaultConfig(PROJECT_ID);

    expect(parseConfig({ ...config, defaultAgent: "codex" })).toMatchObject({
      defaultAgent: "codex",
    });
  });

  it("validates explicit quality gate commands and defaults", () => {
    const config = createDefaultConfig(PROJECT_ID);

    expect(
      parseConfig({
        ...config,
        qualityGates: [
          { id: "typecheck", command: "npm", args: ["run", "typecheck"] },
        ],
      }),
    ).toMatchObject({
      qualityGates: [
        {
          id: "typecheck",
          command: "npm",
          args: ["run", "typecheck"],
          timeoutMs: 120_000,
        },
      ],
    });
    expect(() =>
      parseConfig({
        ...config,
        qualityGates: [
          { id: "test", command: "npm" },
          { id: "test", command: "pnpm" },
        ],
      }),
    ).toThrowError(AutoForgeError);
  });

  it("rejects unsupported versions and unknown fields", () => {
    const config = createDefaultConfig(PROJECT_ID);

    expect(() => parseConfig({ ...config, schemaVersion: 2 })).toThrowError(
      AutoForgeError,
    );
    expect(() => parseConfig({ ...config, legacyMode: true })).toThrowError(
      AutoForgeError,
    );
  });

  it("returns actionable validation metadata", () => {
    try {
      parseConfig({ schemaVersion: CONFIG_SCHEMA_VERSION });
    } catch (error) {
      expect(error).toMatchObject({
        code: "INVALID_CONFIG",
        exitCode: EXIT_CODE.invalidState,
      });
      expect((error as AutoForgeError).details.issues).toBeInstanceOf(Array);
    }
  });
});

describe("state envelope schema", () => {
  it("validates a generic state envelope", () => {
    const schema = createStateEnvelopeSchema(
      z.object({ value: z.string() }).strict(),
    );

    expect(
      parseStateEnvelope(schema, {
        schemaVersion: STATE_SCHEMA_VERSION,
        revision: 3,
        updatedAt: TIMESTAMP,
        data: { value: "stored" },
      }),
    ).toEqual({
      schemaVersion: STATE_SCHEMA_VERSION,
      revision: 3,
      updatedAt: TIMESTAMP,
      data: { value: "stored" },
    });
  });

  it("rejects invalid revision and timestamp values", () => {
    const schema = createStateEnvelopeSchema(z.object({}).strict());

    expect(() =>
      parseStateEnvelope(schema, {
        schemaVersion: STATE_SCHEMA_VERSION,
        revision: -1,
        updatedAt: "yesterday",
        data: {},
      }),
    ).toThrowError(AutoForgeError);
  });
});

describe("project metadata state", () => {
  it("creates initial metadata at revision zero", () => {
    expect(createProjectMetadataEnvelope(PROJECT_ID, TIMESTAMP)).toEqual({
      schemaVersion: STATE_SCHEMA_VERSION,
      revision: 0,
      updatedAt: TIMESTAMP,
      data: {
        projectId: PROJECT_ID,
        initializedAt: TIMESTAMP,
      },
    });
  });

  it("rejects future schema versions", () => {
    const envelope = createProjectMetadataEnvelope(PROJECT_ID, TIMESTAMP);

    expect(() =>
      parseProjectMetadataEnvelope({ ...envelope, schemaVersion: 2 }),
    ).toThrowError(AutoForgeError);
  });
});
