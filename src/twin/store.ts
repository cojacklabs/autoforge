import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { twinProjectionSchema, type TwinProjection } from "./schemas.js";

export const DEFAULT_TWIN_PATH = ".autoforge/twin/projection.json";

export class TwinProjectionStore {
  private readonly filePath: string;

  constructor(projectRoot: string, relativePath = DEFAULT_TWIN_PATH) {
    this.filePath = path.resolve(projectRoot, relativePath);
  }

  async read(): Promise<TwinProjection | null> {
    try {
      return twinProjectionSchema.parse(
        JSON.parse(await readFile(this.filePath, "utf8")),
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

  async write(projection: TwinProjection): Promise<TwinProjection> {
    const validated = twinProjectionSchema.parse(projection);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.filePath);
    return validated;
  }
}
