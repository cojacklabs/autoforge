import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import type { AgentAdapterContext } from "./adapter.js";
import { readOptionalText, resolveAgentPath } from "./instructions.js";

export const CLAUDE_SETTINGS_PATH = ".claude/settings.json";
export const CLAUDE_GUARDRAIL_COMMAND = "autoforge check --hook claude";

const MANAGED_HOOK = {
  matcher: "Edit|Write|NotebookEdit",
  hooks: [
    {
      type: "command",
      command: CLAUDE_GUARDRAIL_COMMAND,
      timeout: 30,
    },
  ],
};

export type ClaudeGuardrailHookStatus =
  "configured" | "absent" | "outdated" | "malformed";

export interface PreparedClaudeGuardrailSettings {
  path: string;
  existing: string | undefined;
  merged: string;
  status: ClaudeGuardrailHookStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSettings(content: string | undefined): Record<string, unknown> {
  if (content === undefined) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `${CLAUDE_SETTINGS_PATH} contains invalid JSON`,
      { cause: error, exitCode: EXIT_CODE.invalidState },
    );
  }
  if (!isRecord(parsed)) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `${CLAUDE_SETTINGS_PATH} must contain a JSON object`,
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  return parsed;
}

function isManagedHandler(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.type === "command" &&
    value.command === CLAUDE_GUARDRAIL_COMMAND
  );
}

function configured(settings: Record<string, unknown>): boolean {
  if (!isRecord(settings.hooks)) {
    return false;
  }
  const preToolUse = settings.hooks.PreToolUse;
  return (
    Array.isArray(preToolUse) &&
    preToolUse.some(
      (group) =>
        isRecord(group) &&
        group.matcher === MANAGED_HOOK.matcher &&
        Array.isArray(group.hooks) &&
        group.hooks.some(isManagedHandler),
    )
  );
}

function mergeSettings(
  settings: Record<string, unknown>,
): Record<string, unknown> {
  const hooks =
    settings.hooks === undefined
      ? {}
      : isRecord(settings.hooks)
        ? settings.hooks
        : undefined;
  if (!hooks) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `${CLAUDE_SETTINGS_PATH} hooks must be a JSON object`,
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  const existingPreToolUse = hooks.PreToolUse ?? [];
  if (!Array.isArray(existingPreToolUse)) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `${CLAUDE_SETTINGS_PATH} hooks.PreToolUse must be an array`,
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  const retainedGroups = existingPreToolUse.flatMap((group) => {
    if (!isRecord(group) || !Array.isArray(group.hooks)) {
      return [group];
    }
    const retainedHandlers = group.hooks.filter(
      (handler) => !isManagedHandler(handler),
    );
    return retainedHandlers.length > 0
      ? [{ ...group, hooks: retainedHandlers }]
      : [];
  });
  return {
    ...settings,
    hooks: {
      ...hooks,
      PreToolUse: [...retainedGroups, MANAGED_HOOK],
    },
  };
}

export async function inspectClaudeGuardrailHook(
  context: AgentAdapterContext,
): Promise<ClaudeGuardrailHookStatus> {
  const path = await resolveAgentPath(context, CLAUDE_SETTINGS_PATH);
  const existing = await readOptionalText(path);
  if (existing === undefined) {
    return "absent";
  }
  try {
    const settings = parseSettings(existing);
    if (configured(settings)) {
      return "configured";
    }
    return settings.hooks === undefined ? "absent" : "outdated";
  } catch {
    return "malformed";
  }
}

export async function prepareClaudeGuardrailSettings(
  context: AgentAdapterContext,
): Promise<PreparedClaudeGuardrailSettings> {
  const path = await resolveAgentPath(context, CLAUDE_SETTINGS_PATH);
  const existing = await readOptionalText(path);
  const settings = parseSettings(existing);
  const status = configured(settings)
    ? "configured"
    : settings.hooks === undefined
      ? "absent"
      : "outdated";
  return {
    path,
    existing,
    merged:
      status === "configured"
        ? existing!
        : `${JSON.stringify(mergeSettings(settings), null, 2)}\n`,
    status,
  };
}
