import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { z } from "zod";

export const projectLifecycleSchema = z.enum([
  "active",
  "paused",
  "archived",
  "inaccessible",
]);

export const projectMetadataSchema = z
  .object({
    name: z.string().min(1),
    lastSeen: z.string().datetime(),
    aliases: z.array(z.string().min(1)).optional(),
    lifecycle: projectLifecycleSchema.optional(),
    repositoryType: z.string().min(1).optional(),
    defaultBranch: z.string().min(1).optional(),
    packageManager: z.string().min(1).optional(),
    runtime: z.string().min(1).optional(),
    autoforgeVersion: z.string().min(1).optional(),
    contractVersion: z.string().min(1).optional(),
    governanceProfile: z.string().min(1).optional(),
    schemaVersions: z.record(z.string(), z.string().min(1)).optional(),
    capabilities: z.array(z.string().min(1)).optional(),
    lastValidated: z.string().datetime().optional(),
  })
  .strict();

export const globalWorkspaceConfigSchema = z
  .object({
    version: z.literal("0.11.0"),
    projects: z.array(z.string().min(1)),
    projectMetadata: z
      .record(z.string().min(1), projectMetadataSchema)
      .optional(),
    agentCapabilities: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .optional(),
    defaultAgent: z.string().min(1).optional(),
    templatesDirectory: z.string().min(1).optional(),
  })
  .strict();

export type GlobalWorkspaceConfig = z.infer<typeof globalWorkspaceConfigSchema>;
export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;

export function normalizeProjectMetadata(
  metadata: ProjectMetadata,
): ProjectMetadata {
  return projectMetadataSchema.parse({
    ...metadata,
    aliases: metadata.aliases ?? [],
    lifecycle: metadata.lifecycle ?? "active",
  });
}

export function migrateGlobalWorkspaceConfig(
  config: GlobalWorkspaceConfig,
): GlobalWorkspaceConfig {
  return globalWorkspaceConfigSchema.parse({
    ...config,
    projectMetadata: config.projectMetadata
      ? Object.fromEntries(
          Object.entries(config.projectMetadata).map(([project, metadata]) => [
            project,
            normalizeProjectMetadata(metadata),
          ]),
        )
      : config.projectMetadata,
  });
}

export class GlobalWorkspaceStore {
  private readonly directory: string;
  private readonly filePath: string;

  constructor(homeDirectory = os.homedir()) {
    this.directory = path.join(homeDirectory, ".autoforge");
    this.filePath = path.join(this.directory, "config.json");
  }

  assetDirectory(kind: "templates" | "doctrines" | "cache" | "logs"): string {
    return path.join(this.directory, kind);
  }

  async listAssets(kind: "templates" | "doctrines"): Promise<string[]> {
    try {
      return (await readdir(this.assetDirectory(kind), { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }

  async read(): Promise<GlobalWorkspaceConfig> {
    return globalWorkspaceConfigSchema.parse(
      JSON.parse(await readFile(this.filePath, "utf8")) as unknown,
    );
  }

  async write(config: GlobalWorkspaceConfig): Promise<string> {
    const validated = globalWorkspaceConfigSchema.parse(config);
    await mkdir(this.directory, { recursive: true });
    await Promise.all(
      ["templates", "doctrines", "cache", "logs"].map((name) =>
        mkdir(path.join(this.directory, name), { recursive: true }),
      ),
    );
    const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(
        temporary,
        `${JSON.stringify(validated, null, 2)}\n`,
        "utf8",
      );
      await rename(temporary, this.filePath);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
    return this.filePath;
  }

  async registerProject(projectRoot: string): Promise<GlobalWorkspaceConfig> {
    const current = await this.read().catch(() => ({
      version: "0.11.0" as const,
      projects: [],
      projectMetadata: {},
    }));
    const project = path.resolve(projectRoot);
    const projects = [...new Set([...current.projects, project])].sort();
    const projectMetadata = {
      ...(current.projectMetadata ?? {}),
      [project]: {
        name: path.basename(project),
        lastSeen: new Date().toISOString(),
      },
    };
    const updated = globalWorkspaceConfigSchema.parse({
      ...current,
      projects,
      projectMetadata,
    });
    await this.write(updated);
    return updated;
  }

  async unregisterProject(projectRoot: string): Promise<GlobalWorkspaceConfig> {
    const current = await this.read().catch(() => ({
      version: "0.11.0" as const,
      projects: [],
      projectMetadata: {},
    }));
    const project = path.resolve(projectRoot);
    const updated = globalWorkspaceConfigSchema.parse({
      ...current,
      projects: current.projects.filter((entry) => entry !== project),
      projectMetadata: Object.fromEntries(
        Object.entries(current.projectMetadata ?? {}).filter(
          ([entry]) => entry !== project,
        ),
      ),
    });
    await this.write(updated);
    return updated;
  }

  async updateProjectMetadata(
    projectRoot: string,
    updates: Partial<Pick<ProjectMetadata, "name" | "aliases" | "lifecycle">>,
  ): Promise<GlobalWorkspaceConfig> {
    const current = await this.read();
    const project = path.resolve(projectRoot);
    if (!current.projects.includes(project)) {
      throw new Error(`Project is not registered: ${project}`);
    }
    const existing = current.projectMetadata?.[project] ?? {
      name: path.basename(project),
      lastSeen: new Date().toISOString(),
    };
    const updated = globalWorkspaceConfigSchema.parse({
      ...current,
      projectMetadata: {
        ...(current.projectMetadata ?? {}),
        [project]: {
          ...existing,
          ...updates,
          lastSeen: new Date().toISOString(),
        },
      },
    });
    await this.write(updated);
    return updated;
  }

  async pruneProjects(): Promise<GlobalWorkspaceConfig> {
    const current = await this.read().catch(() => ({
      version: "0.11.0" as const,
      projects: [],
      projectMetadata: {},
    }));
    const inaccessible = await this.findInaccessibleProjects(current);
    const projects = current.projects.filter(
      (project) => !inaccessible.includes(project),
    );
    const updated = globalWorkspaceConfigSchema.parse({
      ...current,
      projects,
      projectMetadata: Object.fromEntries(
        Object.entries(current.projectMetadata ?? {}).filter(([project]) =>
          projects.includes(project),
        ),
      ),
    });
    await this.write(updated);
    return updated;
  }

  async findInaccessibleProjects(
    config?: GlobalWorkspaceConfig,
  ): Promise<string[]> {
    const resolvedConfig = config ?? (await this.read());
    const inaccessible: string[] = [];
    for (const project of resolvedConfig.projects) {
      try {
        await access(project);
      } catch {
        inaccessible.push(project);
      }
    }
    return inaccessible;
  }

  async recordAgentCapabilities(
    capabilities: Record<string, Record<string, unknown>>,
  ): Promise<GlobalWorkspaceConfig> {
    const current = await this.read().catch(() => ({
      version: "0.11.0" as const,
      projects: [],
      projectMetadata: {},
    }));
    const updated = globalWorkspaceConfigSchema.parse({
      ...current,
      agentCapabilities: capabilities,
    });
    await this.write(updated);
    return updated;
  }
}
