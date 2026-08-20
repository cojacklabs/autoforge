import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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

  private filePath(kind: PlanningArtifact["kind"]): string {
    return path.join(this.directory, `${kind}.json`);
  }

  async write(artifact: PlanningArtifact): Promise<string> {
    const validated = planningArtifactSchema.parse(artifact);
    await mkdir(this.directory, { recursive: true });
    const destination = this.filePath(validated.kind);
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

  async read(kind: PlanningArtifact["kind"]): Promise<PlanningArtifact> {
    return planningArtifactSchema.parse(
      JSON.parse(await readFile(this.filePath(kind), "utf8")) as unknown,
    );
  }

  async isFresh(
    kind: PlanningArtifact["kind"],
    sourceFingerprint: string,
  ): Promise<boolean> {
    const artifact = await this.read(kind);
    return artifact.sourceFingerprint === sourceFingerprint;
  }
}
