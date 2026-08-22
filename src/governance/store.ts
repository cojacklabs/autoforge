import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  constitutionArtifactSchema,
  type ConstitutionArtifact,
} from "./schemas.js";

export class ConstitutionStore {
  constructor(private readonly projectRoot: string) {}

  private get filePath(): string {
    return path.join(
      path.resolve(this.projectRoot),
      ".autoforge",
      "governance",
      "constitution.json",
    );
  }

  async save(constitution: ConstitutionArtifact): Promise<string> {
    const validated = constitutionArtifactSchema.parse(constitution);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    return this.filePath;
  }

  async load(): Promise<ConstitutionArtifact | null> {
    try {
      return constitutionArtifactSchema.parse(
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
