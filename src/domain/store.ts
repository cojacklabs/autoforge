import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { domainArtifactSchema, type DomainArtifact } from "./schemas.js";

export class DomainStore {
  constructor(private readonly projectRoot: string) {}

  private get filePath(): string {
    return path.join(
      path.resolve(this.projectRoot),
      ".autoforge",
      "domain",
      "domain.json",
    );
  }

  async save(artifact: DomainArtifact): Promise<string> {
    const validated = domainArtifactSchema.parse(artifact);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    return this.filePath;
  }

  async load(): Promise<DomainArtifact | null> {
    try {
      return domainArtifactSchema.parse(
        JSON.parse(await readFile(this.filePath, "utf8")) as unknown,
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
}
