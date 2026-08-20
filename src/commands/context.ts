import { EXIT_CODE, AutoForgeError, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  ContextPacketCompiler,
  formatContextExplanation,
  type ContextPacket,
} from "../context/packet.js";
import { ContextResolver } from "../context/resolver.js";
import type { ContextSelection } from "../context/schemas.js";
import { ContextPacketStore } from "../context/store.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import { SpecificationFileStore } from "../specifications/store.js";
import { inspectInstallation } from "./init.js";

export interface ContextCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  temporaryId?: () => string;
}

export interface CompiledProjectContext {
  packet: ContextPacket;
  selection: ContextSelection;
}

function parseContextArguments(
  args: readonly string[],
  output: LogWriter,
): { explain: boolean } | undefined {
  if (args.length === 0) {
    return { explain: false };
  }
  if (args.length === 1 && args[0] === "--explain") {
    return { explain: true };
  }
  output.stderr("Usage: autoforge context [--explain]");
  return undefined;
}

export async function compileProjectContext(
  projectRoot: string,
): Promise<CompiledProjectContext> {
  const installation = await inspectInstallation(projectRoot);
  if (
    installation.status !== "current" ||
    !installation.config ||
    !installation.work ||
    !installation.decisions ||
    !installation.doctrines ||
    !installation.doctrineSession
  ) {
    throw new AutoForgeError(
      "INVALID_STATE",
      'Context generation requires a current AutoForge installation. Run "autoforge doctor" for details.',
      {
        details: { installationStatus: installation.status },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }

  const specifications = new SpecificationRegistry(
    new SpecificationFileStore(projectRoot),
  );
  const selection = await new ContextResolver().resolve({
    work: installation.work.data,
    decisions: installation.decisions.data,
    doctrines: installation.doctrines.data,
    doctrineSessions: installation.doctrineSession.data,
    specifications,
    config: installation.config,
  });
  const packet = new ContextPacketCompiler().compile(selection);
  return { packet, selection };
}

export async function runContextCommand(
  options: ContextCommandOptions,
): Promise<ExitCode> {
  const parsed = parseContextArguments(options.args, options.output);
  if (!parsed) {
    return EXIT_CODE.usage;
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const { packet, selection } = await compileProjectContext(project.path);
  await new ContextPacketStore(project.path, {
    ...(options.temporaryId ? { temporaryId: options.temporaryId } : {}),
  }).write(packet);
  options.output.stdout(
    parsed.explain
      ? `${packet.content}\n\n---\n\n${formatContextExplanation(selection, packet)}`
      : packet.content,
  );
  return EXIT_CODE.success;
}
