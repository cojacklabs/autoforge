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

const START_MARKER = "<!-- autoforge:grok:start -->";
const END_MARKER = "<!-- autoforge:grok:end -->";
const INSTRUCTIONS_PATH = "AGENTS.md";
const MANAGED_BLOCK = `${START_MARKER}
## AutoForge Context for Grok Build

Before starting implementation, read \`${CANONICAL_AGENT_CONTEXT_PATH}\` when it exists and follow its active work, doctrine, decision, scope, and validation guidance. Run \`autoforge check --agent grok\` before implementation and \`autoforge check --path <file> --agent grok\` before edits.
${END_MARKER}`;
const INSTRUCTION_BLOCK: ManagedInstructionBlock = {
  fileName: INSTRUCTIONS_PATH,
  startMarker: START_MARKER,
  endMarker: END_MARKER,
  content: MANAGED_BLOCK,
};

export interface GrokAgentAdapterOptions {
  temporaryId?: () => string;
}

export class GrokAgentAdapter implements AgentAdapter {
  readonly id = "grok";
  readonly displayName = "Grok Build";
  readonly capabilities: AgentCapabilities = {
    setup: "automatic",
    contextDelivery: ["repository-instructions", "file"],
    enforcement: "advisory",
  };

  private readonly temporaryId: () => string;

  constructor(options: GrokAgentAdapterOptions = {}) {
    this.temporaryId = options.temporaryId ?? randomUUID;
  }

  async detect(context: AgentAdapterContext) {
    const instructions = await readOptionalText(
      await resolveAgentPath(context, INSTRUCTIONS_PATH),
    );
    const instructionStatus = inspectManagedInstructionBlock(
      instructions,
      INSTRUCTION_BLOCK,
    );
    const grokConfig = await pathExists(
      await resolveAgentPath(context, ".grok/config.toml"),
    );
    const projectInstructions = instructions !== undefined;
    const detected = projectInstructions || grokConfig;
    return agentDetectionSchema.parse({
      detected,
      confidence:
        instructionStatus === "configured" ? "high" : detected ? "low" : "none",
      evidence: [
        ...(instructionStatus === "configured"
          ? ["AutoForge Grok Build AGENTS.md block is installed"]
          : projectInstructions
            ? ["Project AGENTS.md is present"]
            : []),
        ...(grokConfig ? ["Project Grok configuration is present"] : []),
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
            ? "Grok Build repository instructions are configured."
            : instructionStatus === "malformed"
              ? "Grok Build repository instructions contain an incomplete managed block."
              : "Grok Build repository instructions are not configured.",
      },
      {
        id: "context-delivery",
        status: contextAvailable ? "pass" : "warn",
        message: contextAvailable
          ? "Shared AutoForge context is available."
          : "Shared AutoForge context has not been delivered yet.",
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
