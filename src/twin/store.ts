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
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
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
    const parsed = twinProjectionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      // A cache written by an older AutoForge version can use a node-type
      // enum this version no longer accepts. Treat it as absent rather than
      // crashing — the caller's usual "run twin generate first" guidance
      // is the correct recovery path.
      return null;
    }
    return parsed.data;
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
