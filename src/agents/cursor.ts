import { randomUUID } from "node:crypto";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
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

const RULE_PATH = ".cursor/rules/autoforge-context.mdc";
const RULE_FRONTMATTER = `---
description: "Loads the current AutoForge orchestration context."
alwaysApply: true
---`;
const START_MARKER = "<!-- autoforge:cursor:start -->";
const END_MARKER = "<!-- autoforge:cursor:end -->";
const MANAGED_BLOCK = `${START_MARKER}
# AutoForge Context

@${CANONICAL_AGENT_CONTEXT_PATH}

Follow the active work, doctrine, decision, scope, and validation guidance in the referenced context. Run \`autoforge check --agent cursor\` before implementation and \`autoforge check --path <file> --agent cursor\` before edits.
${END_MARKER}`;
const INSTRUCTION_BLOCK: ManagedInstructionBlock = {
  fileName: RULE_PATH,
  startMarker: START_MARKER,
  endMarker: END_MARKER,
  content: MANAGED_BLOCK,
};

function hasAlwaysApplyFrontmatter(content: string | undefined): boolean {
  if (content === undefined) {
    return false;
  }
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  return (
    frontmatter !== null &&
    /^alwaysApply:\s*true\s*$/m.test(frontmatter[1] ?? "")
  );
}

export interface CursorAgentAdapterOptions {
  temporaryId?: () => string;
}

export class CursorAgentAdapter implements AgentAdapter {
  readonly id = "cursor";
  readonly displayName = "Cursor";
  readonly capabilities: AgentCapabilities = {
    setup: "automatic",
    contextDelivery: ["repository-instructions", "file"],
    enforcement: "advisory",
  };

  private readonly temporaryId: () => string;

  constructor(options: CursorAgentAdapterOptions = {}) {
    this.temporaryId = options.temporaryId ?? randomUUID;
  }

  async detect(context: AgentAdapterContext) {
    const rule = await readOptionalText(
      await resolveAgentPath(context, RULE_PATH),
    );
    const instructionStatus = inspectManagedInstructionBlock(
      rule,
      INSTRUCTION_BLOCK,
    );
    const configured =
      instructionStatus === "configured" && hasAlwaysApplyFrontmatter(rule);
    const cursorRules = await pathExists(
      await resolveAgentPath(context, ".cursor/rules"),
    );
    const cursorMcp = await pathExists(
      await resolveAgentPath(context, ".cursor/mcp.json"),
    );
    const detected = configured || cursorRules || cursorMcp;
    return agentDetectionSchema.parse({
      detected,
      confidence: configured ? "high" : detected ? "low" : "none",
      evidence: [
        ...(configured
          ? ["AutoForge Cursor project rule is installed"]
          : rule !== undefined
            ? ["AutoForge Cursor rule path is present"]
            : cursorRules
              ? ["Project Cursor rules directory is present"]
              : []),
        ...(cursorMcp ? ["Project Cursor MCP configuration is present"] : []),
      ],
    });
  }

  async setup(context: AgentAdapterContext) {
    await assertInitializedAgentProject(context);
    const rulePath = await resolveAgentPath(context, RULE_PATH);
    const existing = await readOptionalText(rulePath);
    if (existing !== undefined && !hasAlwaysApplyFrontmatter(existing)) {
      throw new AutoForgeError(
        "INVALID_STATE",
        `${RULE_PATH} exists without alwaysApply: true frontmatter`,
        { exitCode: EXIT_CODE.invalidState },
      );
    }
    const merged =
      existing === undefined
        ? `${RULE_FRONTMATTER}\n${MANAGED_BLOCK}\n`
        : mergeManagedInstructionBlock(existing, INSTRUCTION_BLOCK);
    if (existing === merged) {
      return agentSetupResultSchema.parse({
        status: "already-configured",
        changes: [],
        instructions: null,
      });
    }
    await atomicWriteText(rulePath, merged, this.temporaryId);
    return agentSetupResultSchema.parse({
      status: "configured",
      changes: [RULE_PATH],
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
    const rule = await readOptionalText(
      await resolveAgentPath(context, RULE_PATH),
    );
    const instructionStatus = inspectManagedInstructionBlock(
      rule,
      INSTRUCTION_BLOCK,
    );
    const validFrontmatter = hasAlwaysApplyFrontmatter(rule);
    const contextAvailable = await pathExists(
      await resolveAgentPath(context, CANONICAL_AGENT_CONTEXT_PATH),
    );
    const ruleConfigured =
      instructionStatus === "configured" && validFrontmatter;
    const ruleInvalid =
      instructionStatus === "malformed" ||
      (rule !== undefined && !validFrontmatter);
    const checks = [
      {
        id: "repository-instructions",
        status: ruleConfigured ? "pass" : ruleInvalid ? "fail" : "warn",
        message: ruleConfigured
          ? "Cursor project rule is configured."
          : ruleInvalid
            ? "Cursor project rule is malformed or not always applied."
            : "Cursor project rule is not configured.",
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
