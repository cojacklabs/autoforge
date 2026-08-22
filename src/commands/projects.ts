import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";

export interface ProjectsCommandOptions {
  args: readonly string[];
  output: LogWriter;
  homeDirectory?: string;
}
function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge projects [list | show <path> [--json] | register <path> | prune]",
  );
  return EXIT_CODE.usage;
}
export async function runProjectsCommand(
  options: ProjectsCommandOptions,
): Promise<ExitCode> {
  const [action, projectPath, flag] = options.args;
  const json = flag === "--json";
  if (!action) {
    try {
      const store = new GlobalWorkspaceStore(options.homeDirectory);
      const config = await store.read().catch(() => ({
        version: "0.11.0" as const,
        projects: [],
        projectMetadata: {},
      }));
      options.output.stdout(
        config.projects
          .map((project) => {
            const metadata = (
              config.projectMetadata as
                Record<string, { name: string; lastSeen: string }> | undefined
            )?.[project];
            return metadata ? `${metadata.name}\t${project}` : project;
          })
          .join("\n"),
      );
      return EXIT_CODE.success;
    } catch {
      return usage(options.output);
    }
  }
  if (action === "show") {
    if (!projectPath || (flag !== undefined && !json))
      return usage(options.output);
    try {
      const config = await new GlobalWorkspaceStore(
        options.homeDirectory,
      ).read();
      const resolvedPath = config.projects.find(
        (project) => project === projectPath,
      );
      if (!resolvedPath) return usage(options.output);
      const metadata = config.projectMetadata?.[resolvedPath];
      if (json) {
        options.output.stdout(
          JSON.stringify(
            { path: resolvedPath, metadata: metadata ?? null },
            null,
            2,
          ),
        );
      } else {
        options.output.stdout(
          [
            `Project: ${metadata?.name ?? resolvedPath}`,
            `Path: ${resolvedPath}`,
            ...(metadata
              ? Object.entries(metadata).map(
                  ([key, value]) =>
                    `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
                )
              : []),
          ].join("\n"),
        );
      }
      return EXIT_CODE.success;
    } catch {
      return usage(options.output);
    }
  }
  if (
    action === "register"
      ? !projectPath || options.args.length !== 2
      : options.args.length !== 1
  )
    return usage(options.output);
  try {
    const store = new GlobalWorkspaceStore(options.homeDirectory);
    if (action === "register") {
      const config = await store.registerProject(projectPath!);
      options.output.stdout(
        `Registered project. Total projects: ${config.projects.length}.`,
      );
    } else if (action === "prune") {
      const config = await store.pruneProjects();
      options.output.stdout(
        `Pruned registry. Total projects: ${config.projects.length}.`,
      );
    } else if (action === "list") {
      const config = await store.read().catch(() => ({
        version: "0.11.0" as const,
        projects: [],
        projectMetadata: {},
      }));
      options.output.stdout(
        config.projects
          .map((project) => {
            const metadata = (
              config.projectMetadata as
                Record<string, { name: string; lastSeen: string }> | undefined
            )?.[project];
            return metadata ? `${metadata.name}\t${project}` : project;
          })
          .join("\n"),
      );
    } else return usage(options.output);
    return EXIT_CODE.success;
  } catch {
    return usage(options.output);
  }
}
