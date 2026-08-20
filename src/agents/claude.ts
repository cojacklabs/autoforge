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
  CLAUDE_SETTINGS_PATH,
  inspectClaudeGuardrailHook,
  prepareClaudeGuardrailSettings,
} from "./claude-hooks.js";
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

const START_MARKER = "<!-- autoforge:claude:start -->";
const END_MARKER = "<!-- autoforge:claude:end -->";
const INSTRUCTIONS_PATH = "CLAUDE.md";
const MANAGED_BLOCK = `${START_MARKER}
## AutoForge Context

Before starting implementation, read \`${CANONICAL_AGENT_CONTEXT_PATH}\` when it exists and follow its active work, doctrine, decision, scope, and validation guidance. AutoForge's managed Claude hook blocks native file edits without active, in-scope, current context.
${END_MARKER}`;
const INSTRUCTION_BLOCK: ManagedInstructionBlock = {
  fileName: INSTRUCTIONS_PATH,
  startMarker: START_MARKER,
  endMarker: END_MARKER,
  content: MANAGED_BLOCK,
};

export interface ClaudeAgentAdapterOptions {
  temporaryId?: () => string;
}

export class ClaudeAgentAdapter implements AgentAdapter {
  readonly id = "claude";
  readonly displayName = "Claude Code";
  readonly capabilities: AgentCapabilities = {
    setup: "automatic",
    contextDelivery: ["repository-instructions", "file"],
    enforcement: "hard",
  };

  private readonly temporaryId: () => string;

  constructor(options: ClaudeAgentAdapterOptions = {}) {
    this.temporaryId = options.temporaryId ?? randomUUID;
  }

  async detect(context: AgentAdapterContext) {
    const instructionsPath = await resolveAgentPath(context, INSTRUCTIONS_PATH);
    const instructions = await readOptionalText(instructionsPath);
    const instructionStatus = inspectManagedInstructionBlock(
      instructions,
      INSTRUCTION_BLOCK,
    );
    const claudeSettings = await pathExists(
      await resolveAgentPath(context, ".claude/settings.json"),
    );
    const hookStatus = await inspectClaudeGuardrailHook(context);
    const projectInstructions = instructions !== undefined;
    const detected = projectInstructions || claudeSettings;
    return agentDetectionSchema.parse({
      detected,
      confidence:
        instructionStatus === "configured" && hookStatus === "configured"
          ? "high"
          : detected
            ? "low"
            : "none",
      evidence: [
        ...(instructionStatus === "configured"
          ? ["AutoForge Claude CLAUDE.md block is installed"]
          : projectInstructions
            ? ["Project CLAUDE.md is present"]
            : []),
        ...(claudeSettings ? ["Project Claude settings are present"] : []),
        ...(hookStatus === "configured"
          ? ["AutoForge Claude edit guardrail hook is installed"]
          : []),
      ],
    });
  }

  async setup(context: AgentAdapterContext) {
    await assertInitializedAgentProject(context);
    const instructionsPath = await resolveAgentPath(context, INSTRUCTIONS_PATH);
    const existing = await readOptionalText(instructionsPath);
    const merged = mergeManagedInstructionBlock(existing, INSTRUCTION_BLOCK);
    const hook = await prepareClaudeGuardrailSettings(context);
    const instructionChanged = existing !== merged;
    const hookChanged = hook.existing !== hook.merged;
    if (!instructionChanged && !hookChanged) {
      return agentSetupResultSchema.parse({
        status: "already-configured",
        changes: [],
        instructions: null,
      });
    }
    if (instructionChanged) {
      await atomicWriteText(instructionsPath, merged, this.temporaryId);
    }
    if (hookChanged) {
      await atomicWriteText(hook.path, hook.merged, this.temporaryId);
    }
    return agentSetupResultSchema.parse({
      status: "configured",
      changes: [
        ...(instructionChanged ? [INSTRUCTIONS_PATH] : []),
        ...(hookChanged ? [CLAUDE_SETTINGS_PATH] : []),
      ],
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
    const hookStatus = await inspectClaudeGuardrailHook(context);
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
            ? "Claude repository instructions are configured."
            : instructionStatus === "malformed"
              ? "Claude repository instructions contain an incomplete managed block."
              : "Claude repository instructions are not configured.",
      },
      {
        id: "edit-guardrail",
        status:
          hookStatus === "configured"
            ? "pass"
            : hookStatus === "malformed"
              ? "fail"
              : "warn",
        message:
          hookStatus === "configured"
            ? "Claude native file edits use the AutoForge hard guardrail."
            : hookStatus === "malformed"
              ? "Claude settings are malformed; the edit guardrail cannot be verified."
              : "Claude edit guardrail is not configured.",
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
