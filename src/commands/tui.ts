import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  createNodeTuiTerminal,
  runTuiSession,
  type TuiTerminal,
} from "../tui/app.js";
import { renderTuiView } from "../tui/renderer.js";
import { tuiViewIdSchema, type TuiViewId } from "../tui/schemas.js";
import { TuiProjectService } from "../tui/service.js";

export interface TuiCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  interactive?: boolean;
  terminal?: TuiTerminal;
  width?: number;
}

interface TuiArguments {
  snapshot: boolean;
  view: TuiViewId;
  color: boolean;
}

function usage(output: LogWriter): undefined {
  output.stderr(
    "Usage: autoforge tui [--snapshot] [--view <view>] [--no-color]",
  );
  return undefined;
}

function parseArguments(
  args: readonly string[],
  output: LogWriter,
): TuiArguments | undefined {
  let snapshot = false;
  let view: TuiViewId = "dashboard";
  let color = true;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--snapshot") snapshot = true;
    else if (argument === "--no-color") color = false;
    else if (argument === "--view") {
      const value = args[index + 1];
      const result = tuiViewIdSchema.safeParse(value);
      if (!result.success) return usage(output);
      view = result.data;
      index += 1;
    } else return usage(output);
  }
  return { snapshot, view, color };
}

export async function runTuiCommand(
  options: TuiCommandOptions,
): Promise<ExitCode> {
  const parsed = parseArguments(options.args, options.output);
  if (!parsed) return EXIT_CODE.usage;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const service = new TuiProjectService(project.path);
  if (parsed.snapshot) {
    const view = await service.loadView(parsed.view);
    options.output.stdout(
      renderTuiView(view, {
        projectName: service.projectName,
        color: false,
        ...(options.width === undefined ? {} : { width: options.width }),
      }),
    );
    return EXIT_CODE.success;
  }
  const interactive =
    options.interactive ??
    (process.stdin.isTTY === true && process.stdout.isTTY === true);
  if (!interactive) {
    options.output.stderr(
      'Interactive TUI requires a terminal. Use "autoforge tui --snapshot" instead.',
    );
    return EXIT_CODE.usage;
  }
  await runTuiSession({
    service,
    terminal: options.terminal ?? createNodeTuiTerminal(),
    initialView: parsed.view,
    color: parsed.color,
    ...(options.width === undefined ? {} : { width: options.width }),
  });
  return EXIT_CODE.success;
}
