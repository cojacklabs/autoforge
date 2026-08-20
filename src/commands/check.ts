import path from "node:path";

import { z } from "zod";

import { createDefaultAgentRegistry } from "../agents/registry.js";
import { compileProjectContext } from "./context.js";
import { ContextPacketStore } from "../context/store.js";
import { AutoForgeError, EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { SessionRecoveryService } from "../guardrails/recovery.js";
import { GuardrailService } from "../guardrails/service.js";
import type {
  GuardrailEnforcement,
  GuardrailReport,
} from "../guardrails/schemas.js";
import { inspectInstallation } from "./init.js";

interface ParsedCheckArguments {
  agentId?: string;
  hook: "claude" | null;
  install: boolean;
  path?: string;
  refresh: boolean;
  repair: boolean;
}

export interface CheckCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  readStdin?: () => Promise<string>;
  temporaryId?: () => string;
  now?: () => Date;
  sessionId?: () => string;
}

const claudeHookInputSchema = z
  .object({
    cwd: z.string().trim().min(1),
    hook_event_name: z.literal("PreToolUse"),
    tool_name: z.enum(["Edit", "Write", "NotebookEdit"]),
    tool_input: z.record(z.string(), z.unknown()),
  })
  .passthrough();

function usageError(output: LogWriter, message: string): undefined {
  output.stderr(message);
  output.stderr('Run "autoforge help" for usage.');
  return undefined;
}

function parseCheckArguments(
  args: readonly string[],
  output: LogWriter,
): ParsedCheckArguments | undefined {
  const parsed: ParsedCheckArguments = {
    hook: null,
    install: false,
    refresh: false,
    repair: false,
  };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--refresh" || flag === "--repair" || flag === "--install") {
      if (seen.has(flag)) {
        return usageError(output, `Option ${flag} may only be provided once.`);
      }
      seen.add(flag);
      if (flag === "--refresh") parsed.refresh = true;
      if (flag === "--repair") parsed.repair = true;
      if (flag === "--install") parsed.install = true;
      continue;
    }
    if (flag !== "--path" && flag !== "--agent" && flag !== "--hook") {
      return usageError(output, `Unknown check option: ${flag ?? "<missing>"}`);
    }
    if (seen.has(flag)) {
      return usageError(output, `Option ${flag} may only be provided once.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return usageError(output, `Option ${flag} requires a value.`);
    }
    seen.add(flag);
    index += 1;
    if (flag === "--path") parsed.path = value;
    if (flag === "--agent") parsed.agentId = value;
    if (flag === "--hook") {
      if (value !== "claude") {
        return usageError(output, `Unsupported hook adapter: ${value}`);
      }
      parsed.hook = value;
    }
  }
  if (parsed.hook && args.length !== 2) {
    return usageError(
      output,
      "Option --hook cannot be combined with other options.",
    );
  }
  if (parsed.install && !parsed.agentId) {
    return usageError(output, "Option --install requires --agent <id>.");
  }
  return parsed;
}

async function readStandardInput(): Promise<string> {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
}

function parseClaudeHookInput(value: string): {
  cwd: string;
  path: string;
} {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch (error) {
    throw new AutoForgeError("INVALID_ARGUMENT", "Invalid Claude hook JSON", {
      cause: error,
      exitCode: EXIT_CODE.usage,
    });
  }
  const input = claudeHookInputSchema.parse(decoded);
  const candidate =
    input.tool_input.file_path ?? input.tool_input.notebook_path;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new AutoForgeError(
      "INVALID_ARGUMENT",
      `Claude ${input.tool_name} hook input does not contain a file path`,
      { exitCode: EXIT_CODE.usage },
    );
  }
  return { cwd: input.cwd, path: candidate };
}

function formatGuardrailReport(
  report: GuardrailReport,
  events: readonly string[],
): string {
  return [
    `AutoForge guardrail: ${report.allowed ? "PASS" : "FAIL"} (${report.enforcement})`,
    ...(report.agentId ? [`Agent: ${report.agentId}`] : []),
    ...(report.workId ? [`Work: ${report.workId}`] : []),
    ...(report.targetPath ? [`Path: ${report.targetPath}`] : []),
    ...events,
    ...report.checks.map(
      (check) => `[${check.status.toUpperCase()}] ${check.message}`,
    ),
  ].join("\n");
}

function requiredInstallationState(
  installation: Awaited<ReturnType<typeof inspectInstallation>>,
) {
  if (
    !installation.work ||
    !installation.session ||
    !installation.doctrines ||
    !installation.doctrineSession
  ) {
    throw new AutoForgeError(
      "INVALID_STATE",
      "Guardrail checks require readable AutoForge state",
      {
        details: { installationStatus: installation.status },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }
  return {
    work: installation.work.data,
    sessions: installation.session.data,
    doctrines: installation.doctrines.data,
    doctrineSessions: installation.doctrineSession.data,
  };
}

export async function runCheckCommand(
  options: CheckCommandOptions,
): Promise<ExitCode> {
  const parsed = parseCheckArguments(options.args, options.output);
  if (!parsed) {
    return EXIT_CODE.usage;
  }

  let hookPath: string | undefined;
  let startDirectory = options.startDirectory;
  if (parsed.hook === "claude") {
    try {
      const hook = parseClaudeHookInput(
        await (options.readStdin ?? readStandardInput)(),
      );
      hookPath = path.isAbsolute(hook.path)
        ? hook.path
        : path.resolve(hook.cwd, hook.path);
      startDirectory = hook.cwd;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.output.stderr(`AutoForge guardrail denied edit: ${message}`);
      return EXIT_CODE.usage;
    }
  }

  try {
    const project = await discoverProjectRoot({ startDirectory });
    const events: string[] = [];
    if (parsed.repair) {
      const recovery = await new SessionRecoveryService(project.path, {
        ...(options.now ? { now: options.now } : {}),
        ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      }).repair();
      if (recovery.repairs.length === 0) {
        events.push("Recovery: state was already healthy.");
      }
      events.push(...recovery.repairs.map((repair) => `Recovery: ${repair}.`));
    }

    const registry = createDefaultAgentRegistry();
    const agentId = parsed.hook ?? parsed.agentId;
    const adapter = agentId ? registry.get(agentId) : undefined;
    if (parsed.install && adapter) {
      const setup = await adapter.setup({ projectRoot: project.path });
      events.push(
        `Agent setup: ${setup.status}${setup.changes.length > 0 ? ` (${setup.changes.join(", ")})` : ""}.`,
      );
    }
    const enforcement: GuardrailEnforcement =
      adapter?.capabilities.enforcement === "hard" ? "hard" : "advisory";

    let installation = await inspectInstallation(project.path);
    const state = requiredInstallationState(installation);
    let expectedPacket;
    if (installation.status === "current" && state.work.activeWork !== null) {
      expectedPacket = (await compileProjectContext(project.path)).packet;
    }
    if (parsed.refresh) {
      if (!expectedPacket) {
        throw new AutoForgeError(
          "STATE_CONFLICT",
          "Context refresh requires healthy active work and session state",
          { exitCode: EXIT_CODE.conflict },
        );
      }
      await new ContextPacketStore(project.path, {
        ...(options.temporaryId ? { temporaryId: options.temporaryId } : {}),
      }).write(expectedPacket);
      events.push("Context: refreshed canonical and per-work packets.");
      installation = await inspectInstallation(project.path);
    }

    const report = await new GuardrailService(project.path).evaluate({
      ...requiredInstallationState(installation),
      ...(expectedPacket ? { expectedPacket } : {}),
      enforcement,
      ...(agentId ? { agentId } : {}),
      ...((hookPath ?? parsed.path)
        ? { targetPath: hookPath ?? parsed.path }
        : {}),
    });
    const formatted = formatGuardrailReport(report, events);
    if (parsed.hook === "claude") {
      if (!report.allowed) {
        options.output.stderr(formatted);
        return EXIT_CODE.usage;
      }
      return EXIT_CODE.success;
    }
    if (report.allowed) {
      options.output.stdout(formatted);
      return EXIT_CODE.success;
    }
    options.output.stderr(formatted);
    return EXIT_CODE.invalidState;
  } catch (error) {
    if (parsed.hook === "claude") {
      const message = error instanceof Error ? error.message : String(error);
      options.output.stderr(`AutoForge guardrail denied edit: ${message}`);
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
