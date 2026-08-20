import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { discoverProjectRoot } from "../core/project.js";
import { serializeSpecificationMarkdown } from "../specifications/codec.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import { SpecificationFileStore } from "../specifications/store.js";
import { specificationSchema } from "../specifications/schemas.js";
import { readFile } from "node:fs/promises";

export interface KnowledgeCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

export async function registerKnowledgeSpecification(
  projectPath: string,
  file: string,
  expectedType: "intent" | "research",
): Promise<{ id: string; path: string }> {
  const resolved = await resolveContainedProjectPath(projectPath, file);
  const parsed = specificationSchema.parse(
    JSON.parse(await readFile(resolved.absolutePath, "utf8")) as unknown,
  );
  if (parsed.type !== expectedType) throw new Error(`Expected ${expectedType}`);
  const { updatedAt: _updatedAt, design, knowledge, ...input } = parsed;
  const result = await new SpecificationRegistry(
    new SpecificationFileStore(projectPath),
  ).register({
    ...input,
    ...(design === undefined ? {} : { design }),
    ...(knowledge === undefined ? {} : { knowledge }),
  });
  return { id: result.specification.id, path: result.path };
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge knowledge list [--type <intent|research>] | autoforge knowledge show <id>",
  );
  return EXIT_CODE.usage;
}

export async function runKnowledgeCommand(
  options: KnowledgeCommandOptions,
): Promise<ExitCode> {
  const [action, subject, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const registry = new SpecificationRegistry(
    new SpecificationFileStore(project.path),
  );
  if (action === "list") {
    let type: "intent" | "research" | undefined;
    if (subject !== undefined || rest.length > 0) {
      if (
        subject !== "--type" ||
        rest.length !== 1 ||
        !["intent", "research"].includes(rest[0] ?? "")
      )
        return usage(options.output);
      type = rest[0] as "intent" | "research";
    }
    const specifications = await registry.list(type ? { types: [type] } : {});
    options.output.stdout(
      [
        `AutoForge knowledge specifications: ${specifications.length}`,
        ...specifications
          .filter(
            (specification) =>
              specification.type === "intent" ||
              specification.type === "research",
          )
          .map(
            (specification) =>
              `${specification.id} [${specification.type}] — ${specification.description}`,
          ),
      ].join("\n"),
    );
    return EXIT_CODE.success;
  }
  if (action === "show" && subject && rest.length === 0) {
    const specification = specificationSchema.parse(
      await registry.read(subject),
    );
    if (specification.type !== "intent" && specification.type !== "research")
      return usage(options.output);
    options.output.stdout(
      serializeSpecificationMarkdown(specification).trimEnd(),
    );
    return EXIT_CODE.success;
  }
  return usage(options.output);
}
