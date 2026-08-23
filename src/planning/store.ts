import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { planningArtifactSchema, type PlanningArtifact } from "./artifacts.js";

export const DEFAULT_PLANNING_DIRECTORY = ".autoforge/planning";

export class PlanningArtifactStore {
  private readonly projectRoot: string;
  private readonly directory: string;

  constructor(projectRoot: string, directory = DEFAULT_PLANNING_DIRECTORY) {
    this.projectRoot = projectRoot;
    this.directory = path.join(projectRoot, directory);
  }

  private kindDirectory(kind: PlanningArtifact["kind"]): string {
    return path.join(this.directory, kind);
  }

  private filePath(
    kind: PlanningArtifact["kind"],
    sourceFingerprint: string,
  ): string {
    return path.join(this.kindDirectory(kind), `${sourceFingerprint}.json`);
  }

  async write(artifact: PlanningArtifact): Promise<string> {
    const validated = planningArtifactSchema.parse(artifact);
    const kindDirectory = this.kindDirectory(validated.kind);
    await mkdir(kindDirectory, { recursive: true });
    const destination = this.filePath(
      validated.kind,
      validated.sourceFingerprint,
    );
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(
      temporary,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporary, destination);
    return path
      .relative(this.projectRoot, destination)
      .replaceAll(path.sep, "/");
  }

  async listVersions(
    kind: PlanningArtifact["kind"],
  ): Promise<PlanningArtifact[]> {
    let entries: string[];
    try {
      entries = await readdir(this.kindDirectory(kind));
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return [];
      }
      throw error;
    }
    const artifacts = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) =>
          planningArtifactSchema.parse(
            JSON.parse(
              await readFile(
                path.join(this.kindDirectory(kind), entry),
                "utf8",
              ),
            ) as unknown,
          ),
        ),
    );
    return artifacts.sort(
      (a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt),
    );
  }

  async read(
    kind: PlanningArtifact["kind"],
    sourceFingerprint?: string,
  ): Promise<PlanningArtifact | null> {
    if (sourceFingerprint) {
      try {
        return planningArtifactSchema.parse(
          JSON.parse(
            await readFile(this.filePath(kind, sourceFingerprint), "utf8"),
          ) as unknown,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return null;
        }
        throw error;
      }
    }
    const versions = await this.listVersions(kind);
    return versions[0] ?? null;
  }

  async isFresh(
    kind: PlanningArtifact["kind"],
    sourceFingerprint: string,
  ): Promise<boolean> {
    const artifact = await this.read(kind, sourceFingerprint);
    return artifact?.sourceFingerprint === sourceFingerprint;
  }
}
