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
  type ManagedInstructionStatus,
} from "./instructions.js";

const GEMINI_INSTRUCTIONS_PATH = "GEMINI.md";
const ANTIGRAVITY_RULE_PATH = ".agents/rules/autoforge.md";
const GEMINI_BLOCK: ManagedInstructionBlock = {
  fileName: GEMINI_INSTRUCTIONS_PATH,
  startMarker: "<!-- autoforge:gemini:start -->",
  endMarker: "<!-- autoforge:gemini:end -->",
  content: `<!-- autoforge:gemini:start -->
## AutoForge Context

@./${CANONICAL_AGENT_CONTEXT_PATH}

Before edits, run \`autoforge check --path <file> --agent gemini\` and follow advisory diagnostics.
<!-- autoforge:gemini:end -->`,
};
const ANTIGRAVITY_BLOCK: ManagedInstructionBlock = {
  fileName: ANTIGRAVITY_RULE_PATH,
  startMarker: "<!-- autoforge:antigravity:start -->",
  endMarker: "<!-- autoforge:antigravity:end -->",
  content: `<!-- autoforge:antigravity:start -->
## AutoForge Context

Before starting implementation, read \`${CANONICAL_AGENT_CONTEXT_PATH}\` when it exists and follow its active work, doctrine, decision, scope, and validation guidance. Run \`autoforge check --agent gemini\` before implementation and \`autoforge check --path <file> --agent gemini\` before edits.
<!-- autoforge:antigravity:end -->`,
};

interface InstructionState {
  path: string;
  existing: string | undefined;
  status: ManagedInstructionStatus;
  block: ManagedInstructionBlock;
}

export interface GeminiAgentAdapterOptions {
  temporaryId?: () => string;
}

export class GeminiAgentAdapter implements AgentAdapter {
  readonly id = "gemini";
  readonly displayName = "Gemini CLI / Antigravity";
  readonly capabilities: AgentCapabilities = {
    setup: "automatic",
    contextDelivery: ["repository-instructions", "file"],
    enforcement: "advisory",
  };

  private readonly temporaryId: () => string;

  constructor(options: GeminiAgentAdapterOptions = {}) {
    this.temporaryId = options.temporaryId ?? randomUUID;
  }

  private async instructionStates(
    context: AgentAdapterContext,
  ): Promise<InstructionState[]> {
    return Promise.all(
      [GEMINI_BLOCK, ANTIGRAVITY_BLOCK].map(async (block) => {
        const destinationPath = await resolveAgentPath(context, block.fileName);
        const existing = await readOptionalText(destinationPath);
        return {
          path: destinationPath,
          existing,
          status: inspectManagedInstructionBlock(existing, block),
          block,
        };
      }),
    );
  }

  async detect(context: AgentAdapterContext) {
    const states = await this.instructionStates(context);
    const configured = states.filter((state) => state.status === "configured");
    const geminiSettings = await pathExists(
      await resolveAgentPath(context, ".gemini/settings.json"),
    );
    const nativeConfiguration = states.some(
      (state) => state.existing !== undefined,
    );
    const detected =
      configured.length > 0 || geminiSettings || nativeConfiguration;
    return agentDetectionSchema.parse({
      detected,
      confidence:
        configured.length === states.length
          ? "high"
          : detected
            ? "low"
            : "none",
      evidence: [
        ...(configured.some((state) => state.block === GEMINI_BLOCK)
          ? ["AutoForge Gemini GEMINI.md block is installed"]
          : states[0]?.existing !== undefined
            ? ["Project GEMINI.md is present"]
            : []),
        ...(configured.some((state) => state.block === ANTIGRAVITY_BLOCK)
          ? ["AutoForge Antigravity workspace rule is installed"]
          : states[1]?.existing !== undefined
            ? ["Project Antigravity workspace rule is present"]
            : []),
        ...(geminiSettings ? ["Project Gemini settings are present"] : []),
      ],
    });
  }

  async setup(context: AgentAdapterContext) {
    await assertInitializedAgentProject(context);
    const states = await this.instructionStates(context);
    const changes = states
      .map((state) => ({
        ...state,
        merged: mergeManagedInstructionBlock(state.existing, state.block),
      }))
      .filter((state) => state.existing !== state.merged);
    if (changes.length === 0) {
      return agentSetupResultSchema.parse({
        status: "already-configured",
        changes: [],
        instructions: null,
      });
    }
    for (const change of changes) {
      await atomicWriteText(change.path, change.merged, this.temporaryId);
    }
    return agentSetupResultSchema.parse({
      status: "configured",
      changes: changes.map((change) => change.block.fileName),
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
    const states = await this.instructionStates(context);
    const contextAvailable = await pathExists(
      await resolveAgentPath(context, CANONICAL_AGENT_CONTEXT_PATH),
    );
    const instructionChecks = states.map((state) => ({
      id:
        state.block === GEMINI_BLOCK
          ? "gemini-instructions"
          : "antigravity-rules",
      status:
        state.status === "configured"
          ? ("pass" as const)
          : state.status === "malformed"
            ? ("fail" as const)
            : ("warn" as const),
      message:
        state.status === "configured"
          ? `${state.block.fileName} is configured.`
          : state.status === "malformed"
            ? `${state.block.fileName} contains an incomplete managed block.`
            : `${state.block.fileName} is not configured.`,
    }));
    const checks = [
      ...instructionChecks,
      {
        id: "context-delivery",
        status: contextAvailable ? ("pass" as const) : ("warn" as const),
        message: contextAvailable
          ? "Shared AutoForge context is available."
          : "Shared AutoForge context has not been delivered yet.",
      },
    ];
    const status = checks.some((check) => check.status === "fail")
      ? "unavailable"
      : checks.some((check) => check.status === "warn")
        ? "degraded"
        : "healthy";
    return agentHealthSchema.parse({ status, checks });
  }
}
