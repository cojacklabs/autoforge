import { describe, expect, it } from "vitest";

import type {
  AgentAdapter,
  AgentCapabilities,
  AgentDetection,
} from "../src/agents/adapter.js";
import { AgentRegistry } from "../src/agents/registry.js";
import { AutoForgeError } from "../src/core/errors.js";

const context = { projectRoot: "/workspace/project" };

function createAdapter(
  id: string,
  detection: AgentDetection,
  capabilities: AgentCapabilities,
): AgentAdapter {
  return {
    id,
    displayName: id,
    capabilities,
    async detect() {
      return detection;
    },
    async setup() {
      return {
        status: "already-configured",
        changes: [],
        instructions: null,
      };
    },
    async deliverContext() {
      return {
        status: "delivered",
        mode: capabilities.contextDelivery[0]!,
        artifacts: [],
        message: null,
      };
    },
    async healthCheck() {
      return { status: "healthy", checks: [] };
    },
  };
}

const highFile = createAdapter(
  "high-file",
  { detected: true, confidence: "high", evidence: ["high marker"] },
  { setup: "automatic", contextDelivery: ["file"], enforcement: "advisory" },
);
const lowPrompt = createAdapter(
  "low-prompt",
  { detected: true, confidence: "low", evidence: ["low marker"] },
  { setup: "manual", contextDelivery: ["prompt"], enforcement: "none" },
);
const absentHard = createAdapter(
  "absent-hard",
  { detected: false, confidence: "none", evidence: [] },
  {
    setup: "automatic",
    contextDelivery: ["file", "repository-instructions"],
    enforcement: "hard",
  },
);

describe("agent registry", () => {
  it("validates identity uniqueness and lists adapters by stable ID", () => {
    const registry = new AgentRegistry([lowPrompt, highFile, absentHard]);

    expect(registry.list().map((adapter) => adapter.id)).toEqual([
      "absent-hard",
      "high-file",
      "low-prompt",
    ]);
    expect(() => new AgentRegistry([highFile, highFile])).toThrowError(
      AutoForgeError,
    );
  });

  it("filters by delivery, setup, and minimum enforcement capability", () => {
    const registry = new AgentRegistry([lowPrompt, highFile, absentHard]);

    expect(
      registry
        .list({ contextDelivery: "file", minimumEnforcement: "advisory" })
        .map((adapter) => adapter.id),
    ).toEqual(["absent-hard", "high-file"]);
    expect(
      registry.list({ setup: "manual" }).map((adapter) => adapter.id),
    ).toEqual(["low-prompt"]);
  });

  it("resolves detected adapters by confidence then stable ID", async () => {
    const sameConfidence = createAdapter(
      "alpha-file",
      { detected: true, confidence: "high", evidence: ["alpha marker"] },
      highFile.capabilities,
    );
    const registry = new AgentRegistry([
      lowPrompt,
      highFile,
      sameConfidence,
      absentHard,
    ]);

    await expect(registry.resolve(context)).resolves.toMatchObject({
      adapter: { id: "alpha-file" },
      detection: { confidence: "high" },
    });
    await expect(
      registry.resolve(context, {
        capabilities: { contextDelivery: "prompt" },
      }),
    ).resolves.toMatchObject({ adapter: { id: "low-prompt" } });
  });

  it("honors explicit preference without falling back dishonestly", async () => {
    const registry = new AgentRegistry([lowPrompt, highFile, absentHard]);

    await expect(
      registry.resolve(context, { preferredId: "low-prompt" }),
    ).resolves.toMatchObject({ adapter: { id: "low-prompt" } });
    await expect(
      registry.resolve(context, { preferredId: "absent-hard" }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT", exitCode: 3 });
    await expect(
      registry.resolve(context, {
        preferredId: "low-prompt",
        capabilities: { minimumEnforcement: "advisory" },
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT", exitCode: 3 });
  });

  it("rejects unknown and unsatisfied adapter resolution", async () => {
    const registry = new AgentRegistry([lowPrompt]);

    expect(() => registry.get("missing")).toThrowError(AutoForgeError);
    await expect(
      registry.resolve(context, {
        capabilities: { contextDelivery: "repository-instructions" },
      }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT", exitCode: 3 });
  });
});
