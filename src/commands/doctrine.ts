import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import type { Doctrine, DoctrineRegistry } from "../doctrine/schemas.js";
import { createDoctrineStore } from "../doctrine/store.js";

export interface DoctrineCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

export function formatDoctrineList(registry: DoctrineRegistry): string {
  return [
    `AutoForge doctrines: ${registry.doctrines.length}`,
    ...registry.doctrines.map(
      (doctrine) =>
        `${doctrine.name} [${doctrine.status}, ${doctrine.source}] — ${doctrine.summary}`,
    ),
  ].join("\n");
}

export function formatDoctrine(doctrine: Doctrine): string {
  const routing = doctrine.routing;
  return [
    `${doctrine.id} — ${doctrine.title}`,
    `Status: ${doctrine.status}`,
    `Source: ${doctrine.source}`,
    `Summary: ${doctrine.summary}`,
    `Keywords: ${routing.keywords.join(", ") || "(none)"}`,
    `Work kinds: ${routing.workKinds.join(", ") || "(none)"}`,
    `Scope tags: ${routing.scopeTags.join(", ") || "(none)"}`,
    `Path patterns: ${routing.pathPatterns.join(", ") || "(none)"}`,
    "",
    doctrine.content,
  ].join("\n");
}

export async function runDoctrineCommand(
  options: DoctrineCommandOptions,
): Promise<ExitCode> {
  if (options.args.length > 1) {
    options.output.stderr("Usage: autoforge doctrine [name]");
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const { state } = await createDoctrineStore(project.path).read();
  const [name] = options.args;
  if (name === undefined) {
    options.output.stdout(formatDoctrineList(state.data));
    return EXIT_CODE.success;
  }

  const doctrine = state.data.doctrines.find(
    (candidate) => candidate.name === name || candidate.id === name,
  );
  if (!doctrine) {
    options.output.stderr(`Unknown doctrine: ${name}`);
    return EXIT_CODE.usage;
  }

  options.output.stdout(formatDoctrine(doctrine));
  return EXIT_CODE.success;
}
