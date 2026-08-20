import { randomUUID } from "node:crypto";

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
import {
  CANONICAL_AGENT_CONTEXT_PATH,
  assertInitializedAgentProject,
  writeCanonicalAgentContext,
} from "./context.js";
import {
  atomicWriteText,
  inspectManagedInstructionBlock,
  mergeManagedInstructionBlock,
  pathExists,
  readOptionalText,
  resolveAgentPath,
  type ManagedInstructionBlock,
} from "./instructions.js";

const START_MARKER = "<!-- autoforge:codex:start -->";
const END_MARKER = "<!-- autoforge:codex:end -->";
const INSTRUCTIONS_PATH = "AGENTS.md";
const MANAGED_BLOCK = `${START_MARKER}
## AutoForge Context

Before starting implementation, read \`${CANONICAL_AGENT_CONTEXT_PATH}\` when it exists and follow its active work, doctrine, decision, scope, and validation guidance. Run \`autoforge check --agent codex\` before implementation and \`autoforge check --path <file> --agent codex\` before edits.
${END_MARKER}`;
const INSTRUCTION_BLOCK: ManagedInstructionBlock = {
  fileName: INSTRUCTIONS_PATH,
  startMarker: START_MARKER,
  endMarker: END_MARKER,
  content: MANAGED_BLOCK,
};

export interface CodexAgentAdapterOptions {
  temporaryId?: () => string;
}

export class CodexAgentAdapter implements AgentAdapter {
  readonly id = "codex";
  readonly displayName = "Codex";
  readonly capabilities: AgentCapabilities = {
    setup: "automatic",
    contextDelivery: ["repository-instructions", "file"],
    enforcement: "advisory",
  };

  private readonly temporaryId: () => string;

  constructor(options: CodexAgentAdapterOptions = {}) {
    this.temporaryId = options.temporaryId ?? randomUUID;
  }

  async detect(context: AgentAdapterContext) {
    const instructionsPath = await resolveAgentPath(context, INSTRUCTIONS_PATH);
    const instructions = await readOptionalText(instructionsPath);
    const managed =
      inspectManagedInstructionBlock(instructions, INSTRUCTION_BLOCK) ===
      "configured";
    const codexConfig = await pathExists(
      await resolveAgentPath(context, ".codex/config.toml"),
    );
    const detected = managed || codexConfig;
    return agentDetectionSchema.parse({
      detected,
      confidence: managed ? "high" : detected ? "low" : "none",
      evidence: [
        ...(managed ? ["AutoForge Codex AGENTS.md block is installed"] : []),
        ...(codexConfig ? ["Project Codex configuration is present"] : []),
      ],
    });
  }

  async setup(context: AgentAdapterContext) {
    await assertInitializedAgentProject(context);
    const instructionsPath = await resolveAgentPath(context, INSTRUCTIONS_PATH);
    const existing = await readOptionalText(instructionsPath);
    const merged = mergeManagedInstructionBlock(existing, INSTRUCTION_BLOCK);
    if (existing === merged) {
      return agentSetupResultSchema.parse({
        status: "already-configured",
        changes: [],
        instructions: null,
      });
    }
    await atomicWriteText(instructionsPath, merged, this.temporaryId);
    return agentSetupResultSchema.parse({
      status: "configured",
      changes: [INSTRUCTIONS_PATH],
      instructions: null,
    });
  }

  async deliverContext(
    context: AgentAdapterContext,
    payload: AgentContextPayload,
  ) {
    const setup = await this.setup(context);
    const artifact = await writeCanonicalAgentContext(context, payload, {
      temporaryId: this.temporaryId,
    });
    return agentContextDeliveryResultSchema.parse({
      status: "delivered",
      mode: "repository-instructions",
      artifacts: [...setup.changes, artifact],
      message: null,
    });
  }

  async healthCheck(context: AgentAdapterContext) {
    const instructions = await readOptionalText(
      await resolveAgentPath(context, INSTRUCTIONS_PATH),
    );
    const instructionStatus = inspectManagedInstructionBlock(
      instructions,
      INSTRUCTION_BLOCK,
    );
    const contextAvailable = await pathExists(
      await resolveAgentPath(context, CANONICAL_AGENT_CONTEXT_PATH),
    );
    const checks = [
      {
        id: "repository-instructions",
        status:
          instructionStatus === "configured"
            ? "pass"
            : instructionStatus === "malformed"
              ? "fail"
              : "warn",
        message:
          instructionStatus === "configured"
            ? "Codex repository instructions are configured."
            : instructionStatus === "malformed"
              ? "Codex repository instructions contain an incomplete managed block."
              : "Codex repository instructions are not configured.",
      },
      {
        id: "context-delivery",
        status: contextAvailable ? "pass" : "warn",
        message: contextAvailable
          ? "Codex context is available."
          : "Codex context has not been delivered yet.",
      },
    ] as const;
    const status = checks.some((check) => check.status === "fail")
      ? "unavailable"
      : checks.some((check) => check.status === "warn")
        ? "degraded"
        : "healthy";
    return agentHealthSchema.parse({ status, checks });
  }
}
