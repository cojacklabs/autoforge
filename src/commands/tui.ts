import {
  runStatusCommand,
  type StatusView,
} from "../../apps/core-cli/src/status.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";

export interface TuiCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

const LEGACY_VIEW_MAP: Readonly<Record<string, StatusView>> = {
  dashboard: "summary",
  "active-work": "work",
  features: "work",
  issues: "work",
  tasks: "work",
  decisions: "summary",
  context: "summary",
  specifications: "summary",
  doctrines: "summary",
  agents: "summary",
  health: "summary",
  summary: "summary",
  work: "work",
  next: "next",
};

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge tui [--snapshot] [--view <view>] [--no-color]",
  );
  return EXIT_CODE.usage;
}

function statusArguments(
  args: readonly string[],
  output: LogWriter,
): { args: readonly string[]; snapshot: boolean } | ExitCode {
  let view: StatusView = "summary";
  let snapshot = false;
  let noColor = false;
  let hasView = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--snapshot" && !snapshot) {
      snapshot = true;
      continue;
    }
    if (argument === "--no-color" && !noColor) {
      noColor = true;
      continue;
    }
    if (argument === "--view" && !hasView) {
      const value = args[index + 1];
      const mapped = value ? LEGACY_VIEW_MAP[value] : undefined;
      if (!mapped) return usage(output);
      view = mapped;
      hasView = true;
      index += 1;
      continue;
    }
    return usage(output);
  }
  return { args: ["--view", view], snapshot };
}

export async function runTuiCommand(
  options: TuiCommandOptions,
): Promise<ExitCode> {
  const parsed = statusArguments(options.args, options.output);
  if (typeof parsed === "number") return parsed;
  const output = parsed.snapshot
    ? {
        stdout: (message: string) =>
          options.output.stdout(
            message.replace(/^AutoForge —/, "AutoForge TUI (deprecated) —"),
          ),
        stderr: options.output.stderr,
      }
    : options.output;
  if (!parsed.snapshot) {
    options.output.stderr(
      'Deprecated: "autoforge tui" now aliases "autoforge status". Interactive experiences are moving to the separate AutoForge Agent.',
    );
  }
  return runStatusCommand({
    args: parsed.args,
    output,
    startDirectory: options.startDirectory,
  });
}
