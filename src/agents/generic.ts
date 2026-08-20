import { randomUUID } from "node:crypto";
import { lstat } from "node:fs/promises";
import path from "node:path";

import {
  agentContextDeliveryResultSchema,
  agentDetectionSchema,
  agentHealthSchema,
  agentSetupResultSchema,
  type AgentAdapter,
  type AgentAdapterContext,
  type AgentCapabilities,
  type AgentContextPayload,
} from "./adapter.js";
import { writeCanonicalAgentContext } from "./context.js";
import { resolveAgentPath } from "./instructions.js";

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await lstat(candidatePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export interface GenericAgentAdapterOptions {
  temporaryId?: () => string;
}

export class GenericAgentAdapter implements AgentAdapter {
  readonly id = "generic";
  readonly displayName = "Generic Agent";
  readonly capabilities: AgentCapabilities = {
    setup: "none",
    contextDelivery: ["file"],
    enforcement: "none",
  };

  private readonly temporaryId: () => string;

  constructor(options: GenericAgentAdapterOptions = {}) {
    this.temporaryId = options.temporaryId ?? randomUUID;
  }

  async detect(context: AgentAdapterContext) {
    const configPath = await resolveAgentPath(
      context,
      ".autoforge/config.json",
    );
    const detected = await pathExists(configPath);
    return agentDetectionSchema.parse({
      detected,
      confidence: detected ? "low" : "none",
      evidence: detected ? ["AutoForge project configuration is present"] : [],
    });
  }

  async setup(_context: AgentAdapterContext) {
    return agentSetupResultSchema.parse({
      status: "already-configured",
      changes: [],
      instructions: null,
    });
  }

  async deliverContext(
    context: AgentAdapterContext,
    payload: AgentContextPayload,
  ) {
    const artifact = await writeCanonicalAgentContext(context, payload, {
      temporaryId: this.temporaryId,
    });
    return agentContextDeliveryResultSchema.parse({
      status: "delivered",
      mode: "file",
      artifacts: [artifact],
      message: null,
    });
  }

  async healthCheck(context: AgentAdapterContext) {
    const projectExists = await pathExists(path.resolve(context.projectRoot));
    const configExists = projectExists
      ? await pathExists(
          await resolveAgentPath(context, ".autoforge/config.json"),
        )
      : false;
    const checks = [
      {
        id: "project-root",
        status: projectExists ? "pass" : "fail",
        message: projectExists
          ? "Project root is available."
          : "Project root is unavailable.",
      },
      {
        id: "autoforge-config",
        status: configExists ? "pass" : "fail",
        message: configExists
          ? "AutoForge project configuration is available."
          : "AutoForge project configuration is unavailable.",
      },
    ];
    return agentHealthSchema.parse({
      status: checks.some((check) => check.status === "fail")
        ? "unavailable"
        : "healthy",
      checks,
    });
  }
}
