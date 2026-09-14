import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProjectArtifactRepository } from "@cojacklabs/autoforge-core";
import {
  projectArtifactIdSchema,
  projectArtifactSchema,
  type ProjectArtifact,
} from "@cojacklabs/autoforge-protocol";
import { z } from "zod";

export const DEFAULT_PROJECT_ARTIFACT_REGISTRY =
  ".autoforge/artifacts/registry.json";

const registrySchema = z
  .object({
    schemaVersion: z.literal("1"),
    artifacts: z.array(projectArtifactSchema),
  })
  .strict()
  .superRefine((registry, context) => {
    const ids = new Set<string>();
    registry.artifacts.forEach((artifact, index) => {
      if (ids.has(artifact.id))
        context.addIssue({
          code: "custom",
          message: `Duplicate artifact id: ${artifact.id}`,
          path: ["artifacts", index, "id"],
        });
      ids.add(artifact.id);
    });
    registry.artifacts.forEach((artifact, index) => {
      if (artifact.supersedes && !ids.has(artifact.supersedes))
        context.addIssue({
          code: "custom",
          message: `Unknown superseded artifact: ${artifact.supersedes}`,
          path: ["artifacts", index, "supersedes"],
        });
    });
  });

export class FileProjectArtifactRepository implements ProjectArtifactRepository {
  private readonly filePath: string;
  constructor(
    projectRoot: string,
    relativePath = DEFAULT_PROJECT_ARTIFACT_REGISTRY,
  ) {
    this.filePath = path.resolve(projectRoot, relativePath);
  }
  async read(id: string): Promise<ProjectArtifact | null> {
    const safeId = projectArtifactIdSchema.parse(id);
    return (
      (await this.list()).find((artifact) => artifact.id === safeId) ?? null
    );
  }
  async list(): Promise<ProjectArtifact[]> {
    try {
      const value = registrySchema.parse(
        JSON.parse(await readFile(this.filePath, "utf8")),
      );
      return [...value.artifacts].sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        return [];
      throw error;
    }
  }
  async writeAll(artifacts: ProjectArtifact[]): Promise<string> {
    const value = registrySchema.parse({ schemaVersion: "1", artifacts });
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, this.filePath);
    return this.filePath;
  }
}
