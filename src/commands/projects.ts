import { readFile } from "node:fs/promises";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";
import { inspectProjectStorage } from "../workspace/storage.js";
import {
  inspectProjectInventory,
  inspectProjectSummary,
} from "../workspace/inventory.js";
import {
  createStorageBundle,
  inspectGlobalStorage,
  importStorageBundle,
  relocateProjectStorage,
} from "../workspace/tiered-storage.js";
import { reportCommandError } from "../cli/command-error.js";

export interface ProjectsCommandOptions {
  args: readonly string[];
  output: LogWriter;
  homeDirectory?: string;
}
function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge projects [list [--json] | show <path|project_name> [--json] | relocate <path|project_name> <new-path> [--planned] | move <path|project_name> <new-path> [--planned] | storage <path> [--json] | global-storage <path> [--json] | global-export <path> [--json] | global-import <path> <bundle> [--json] | update <path> [--name <name>] [--alias <alias>] [--lifecycle <state>] [--retention-days <n>] | archive <path> | restore <path> | register <path> | prune [--dry-run]]",
  );
  return EXIT_CODE.usage;
}
export async function runProjectsCommand(
  options: ProjectsCommandOptions,
): Promise<ExitCode> {
  const [action, projectPath, flag] = options.args;
  const json = flag === "--json" || projectPath === "--json";
  if (!action || (action === "list" && (projectPath === "--json" || json))) {
    try {
      const store = new GlobalWorkspaceStore(options.homeDirectory);
      const config = await store.read().catch(() => ({
        version: "0.11.0" as const,
        projects: [],
        projectMetadata: {},
      }));
      if (json) {
        options.output.stdout(
          JSON.stringify(
            config.projects.map((project) => ({
              path: project,
              metadata:
                (
                  config.projectMetadata as Record<string, unknown> | undefined
                )?.[project] ?? null,
            })),
            null,
            2,
          ),
        );
      } else {
        options.output.stdout(
          config.projects
            .map((project) => {
              const metadata = (
                config.projectMetadata as
                  | Record<string, { name: string; lifecycle?: string }>
                  | undefined
              )?.[project];
              return `${metadata?.lifecycle ?? "active"}\t${metadata?.name ?? project}\t${project}`;
            })
            .join("\n"),
        );
      }
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "show") {
    if (!projectPath || (flag !== undefined && !json))
      return usage(options.output);
    try {
      const config = await new GlobalWorkspaceStore(
        options.homeDirectory,
      ).read();
      const resolvedPath = config.projects.find((project) => {
        const metadata = config.projectMetadata?.[project];
        return (
          project === projectPath ||
          metadata?.name === projectPath ||
          metadata?.aliases?.includes(projectPath)
        );
      });
      if (!resolvedPath) return usage(options.output);
      const metadata = config.projectMetadata?.[resolvedPath];
      const inventory = await inspectProjectInventory(resolvedPath);
      const summary = await inspectProjectSummary(resolvedPath);
      if (json) {
        options.output.stdout(
          JSON.stringify(
            {
              path: resolvedPath,
              metadata: metadata ?? null,
              inventory,
              summary,
            },
            null,
            2,
          ),
        );
      } else {
        options.output.stdout(
          [
            `Project: ${metadata?.name ?? resolvedPath}`,
            `Path: ${resolvedPath}`,
            `Inventory: ${inventory.files} files across ${inventory.directories} directories`,
            `Categories: ${Object.entries(inventory.categories)
              .map(([category, count]) => `${category}=${count}`)
              .join(", ")}`,
            `Highlights: ${inventory.highlights.join(", ") || "(none)"}`,
            `Work: features=${summary.work.features}, phases=${summary.work.phases}, tasks=${summary.work.tasks}, issues=${summary.work.issues}`,
            `Decisions: ${summary.decisions}; designs: ${summary.designs}; planning files: ${summary.planningFiles}`,
            `Active work: ${summary.activeWork ? `${summary.activeWork.kind} ${summary.activeWork.id}` : "none"}`,
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
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "relocate" || action === "move") {
    const destination = options.args[2];
    const planned = options.args[3] === "--planned";
    if (
      !projectPath ||
      !destination ||
      options.args.length < 3 ||
      options.args.length > 4 ||
      (options.args.length === 4 && !planned)
    )
      return usage(options.output);
    try {
      const store = new GlobalWorkspaceStore(options.homeDirectory);
      if (planned) {
        await store.planProjectRelocation(projectPath, destination);
        options.output.stdout(
          `Planned project relocation to ${destination}. Run the command again after moving the project to complete registration.`,
        );
      } else {
        const source = await store.resolveProject(projectPath);
        if (!source)
          throw new Error(`Project is not registered: ${projectPath}`);
        const storageMoved = await relocateProjectStorage(
          source,
          destination,
          options.homeDirectory,
        );
        try {
          const result = await store.relocateProject(projectPath, destination);
          options.output.stdout(
            `Relocated project registry from ${result.source} to ${result.destination}${storageMoved ? " and migrated global storage" : ""}.`,
          );
        } catch (error) {
          if (storageMoved) {
            await relocateProjectStorage(
              destination,
              source,
              options.homeDirectory,
            ).catch(() => undefined);
          }
          throw error;
        }
      }
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "update") {
    if (!projectPath) return usage(options.output);
    const updates: {
      name?: string;
      aliases?: string[];
      lifecycle?: "active" | "paused" | "archived" | "inaccessible";
      retentionDays?: number;
    } = {};
    for (let index = 2; index < options.args.length; index += 2) {
      const flag = options.args[index];
      const value = options.args[index + 1];
      if (!value) return usage(options.output);
      if (flag === "--name") updates.name = value;
      else if (flag === "--alias")
        updates.aliases = [...(updates.aliases ?? []), value];
      else if (
        flag === "--lifecycle" &&
        ["active", "paused", "archived", "inaccessible"].includes(value)
      )
        updates.lifecycle = value as Exclude<
          typeof updates.lifecycle,
          undefined
        >;
      else if (flag === "--retention-days") {
        const days = Number(value);
        if (!Number.isInteger(days) || days < 1 || days > 3_650)
          return usage(options.output);
        updates.retentionDays = days;
      } else return usage(options.output);
    }
    if (Object.keys(updates).length === 0) return usage(options.output);
    try {
      const config = await new GlobalWorkspaceStore(
        options.homeDirectory,
      ).updateProjectMetadata(projectPath, updates);
      options.output.stdout(
        `Updated project metadata. Total projects: ${config.projects.length}.`,
      );
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "archive" || action === "restore") {
    if (!projectPath || options.args.length !== 2) return usage(options.output);
    try {
      const lifecycle = action === "archive" ? "archived" : "active";
      await new GlobalWorkspaceStore(
        options.homeDirectory,
      ).updateProjectMetadata(projectPath, { lifecycle });
      options.output.stdout(
        `${action === "archive" ? "Archived" : "Restored"} project metadata.`,
      );
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "storage") {
    if (!projectPath || (flag !== undefined && !json))
      return usage(options.output);
    try {
      const report = await inspectProjectStorage(projectPath);
      const config = await new GlobalWorkspaceStore(
        options.homeDirectory,
      ).read();
      const metadata = config.projectMetadata?.[report.projectPath];
      const enriched = {
        ...report,
        lifecycle: metadata?.lifecycle ?? "active",
        retentionDays: metadata?.retentionDays ?? null,
      };
      options.output.stdout(
        json
          ? JSON.stringify(enriched, null, 2)
          : `Storage: ${report.bytes} bytes across ${report.files} files (${report.exists ? "present" : "missing"}); lifecycle=${enriched.lifecycle}; retention=${enriched.retentionDays ?? "default"} days.`,
      );
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "global-storage") {
    if (!projectPath || (flag !== undefined && !json))
      return usage(options.output);
    try {
      const tierUsage = await inspectGlobalStorage(
        projectPath,
        options.homeDirectory,
      );
      options.output.stdout(
        json
          ? JSON.stringify(tierUsage, null, 2)
          : tierUsage
              .map(
                (entry) =>
                  `${entry.tier}: ${entry.bytes} bytes across ${entry.files} files`,
              )
              .join("\n"),
      );
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "global-export") {
    if (!projectPath || (flag !== undefined && !json))
      return usage(options.output);
    try {
      const bundle = await createStorageBundle(
        projectPath,
        options.homeDirectory,
      );
      options.output.stdout(JSON.stringify(bundle, null, 2));
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (action === "global-import") {
    const bundlePath = options.args[2];
    const jsonOutput = options.args[3] === "--json";
    if (
      !projectPath ||
      !bundlePath ||
      (options.args.length === 4 && !jsonOutput)
    )
      return usage(options.output);
    try {
      const bundle = JSON.parse(await readFile(bundlePath, "utf8")) as unknown;
      const manifest = await importStorageBundle(
        bundle,
        projectPath,
        options.homeDirectory,
      );
      options.output.stdout(
        jsonOutput
          ? JSON.stringify(manifest, null, 2)
          : `Imported storage manifest for ${manifest.projectId}.`,
      );
      return EXIT_CODE.success;
    } catch (error) {
      return reportCommandError(error, options.output);
    }
  }
  if (
    action === "register"
      ? !projectPath || options.args.length !== 2
      : action === "prune"
        ? options.args.length > 2
        : action === "archive" || action === "restore"
          ? !projectPath || options.args.length !== 2
          : action === "global-import"
            ? !projectPath || options.args.length < 3 || options.args.length > 4
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
      if (projectPath !== undefined && projectPath !== "--dry-run") {
        return usage(options.output);
      }
      const inaccessible = await store.findInaccessibleProjects();
      if (projectPath === "--dry-run") {
        options.output.stdout(
          `Prune preview: ${inaccessible.length} inaccessible project(s).`,
        );
      } else {
        const config = await store.pruneProjects();
        options.output.stdout(
          `Pruned registry. Total projects: ${config.projects.length}.`,
        );
      }
    } else if (action === "list") {
      const config = await store.read().catch(() => ({
        version: "0.11.0" as const,
        projects: [],
        projectMetadata: {},
      }));
      options.output.stdout(
        json
          ? JSON.stringify(
              config.projects.map((project) => ({
                path: project,
                metadata:
                  (
                    config.projectMetadata as
                      Record<string, unknown> | undefined
                  )?.[project] ?? null,
              })),
              null,
              2,
            )
          : config.projects
              .map((project) => {
                const metadata = (
                  config.projectMetadata as
                    | Record<string, { name: string; lifecycle?: string }>
                    | undefined
                )?.[project];
                return `${metadata?.lifecycle ?? "active"}\t${metadata?.name ?? project}\t${project}`;
              })
              .join("\n"),
      );
    } else return usage(options.output);
    return EXIT_CODE.success;
  } catch (error) {
    return reportCommandError(error, options.output);
  }
}
