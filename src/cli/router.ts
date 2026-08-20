import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { AUTOFORGE_HELP } from "./help.js";

export type CliOutput = LogWriter;

export interface CliDependencies {
  output: CliOutput;
  version: string;
  commands: {
    add(args: readonly string[]): Promise<ExitCode>;
    check(args: readonly string[]): Promise<ExitCode>;
    context(args: readonly string[]): Promise<ExitCode>;
    decide(args: readonly string[]): Promise<ExitCode>;
    design(args: readonly string[]): Promise<ExitCode>;
    doctrine(args: readonly string[]): Promise<ExitCode>;
    doctor(args: readonly string[]): Promise<ExitCode>;
    done(args: readonly string[]): Promise<ExitCode>;
    gate(args: readonly string[]): Promise<ExitCode>;
    init(args: readonly string[]): Promise<ExitCode>;
    intent?(args: readonly string[]): Promise<ExitCode>;
    research?(args: readonly string[]): Promise<ExitCode>;
    knowledge?(args: readonly string[]): Promise<ExitCode>;
    planning?(args: readonly string[]): Promise<ExitCode>;
    migrate(args: readonly string[]): Promise<ExitCode>;
    recap(args: readonly string[]): Promise<ExitCode>;
    start(args: readonly string[]): Promise<ExitCode>;
    tui(args: readonly string[]): Promise<ExitCode>;
    why(args: readonly string[]): Promise<ExitCode>;
  };
}

function rejectUnexpectedArguments(
  command: string,
  args: readonly string[],
  output: CliOutput,
): ExitCode | undefined {
  if (args.length === 0) {
    return undefined;
  }

  output.stderr(`Command "${command}" does not accept arguments.`);
  return EXIT_CODE.usage;
}

export async function runCli(
  args: readonly string[],
  dependencies: CliDependencies,
): Promise<ExitCode> {
  const [command, ...commandArgs] = args;

  switch (command) {
    case undefined:
    case "help":
    case "-h":
    case "--help": {
      const rejected = rejectUnexpectedArguments(
        command ?? "help",
        commandArgs,
        dependencies.output,
      );
      if (rejected !== undefined) {
        return rejected;
      }

      dependencies.output.stdout(AUTOFORGE_HELP);
      return EXIT_CODE.success;
    }

    case "version":
    case "-v":
    case "--version": {
      const rejected = rejectUnexpectedArguments(
        command,
        commandArgs,
        dependencies.output,
      );
      if (rejected !== undefined) {
        return rejected;
      }

      dependencies.output.stdout(`AutoForge ${dependencies.version}`);
      return EXIT_CODE.success;
    }

    case "init":
      return dependencies.commands.init(commandArgs);

    case "intent":
      return dependencies.commands.intent
        ? dependencies.commands.intent(commandArgs)
        : EXIT_CODE.usage;

    case "research":
      return dependencies.commands.research
        ? dependencies.commands.research(commandArgs)
        : EXIT_CODE.usage;

    case "knowledge":
      return dependencies.commands.knowledge
        ? dependencies.commands.knowledge(commandArgs)
        : EXIT_CODE.usage;

    case "planning":
      return dependencies.commands.planning
        ? dependencies.commands.planning(commandArgs)
        : EXIT_CODE.usage;

    case "migrate":
      return dependencies.commands.migrate(commandArgs);

    case "add":
      return dependencies.commands.add(commandArgs);

    case "check":
      return dependencies.commands.check(commandArgs);

    case "context":
      return dependencies.commands.context(commandArgs);

    case "decide":
      return dependencies.commands.decide(commandArgs);

    case "design":
      return dependencies.commands.design(commandArgs);

    case "doctrine":
      return dependencies.commands.doctrine(commandArgs);

    case "start":
      return dependencies.commands.start(commandArgs);

    case "recap":
      return dependencies.commands.recap(commandArgs);

    case "tui":
      return dependencies.commands.tui(commandArgs);

    case "why":
      return dependencies.commands.why(commandArgs);

    case "doctor":
      return dependencies.commands.doctor(commandArgs);

    case "done":
      return dependencies.commands.done(commandArgs);

    case "gate":
      return dependencies.commands.gate(commandArgs);

    default:
      dependencies.output.stderr(`Unknown command: ${command}`);
      dependencies.output.stderr('Run "autoforge help" for usage.');
      return EXIT_CODE.usage;
  }
}
