import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  traceGraphSchema,
  traceLinkSchema,
  type TraceGraph,
  type TraceLink,
} from "./schemas.js";

export const DEFAULT_TRACE_PATH = ".autoforge/traceability/links.json";

export class TraceabilityStore {
  private readonly filePath: string;

  constructor(projectRoot: string, relativePath = DEFAULT_TRACE_PATH) {
    this.filePath = path.resolve(projectRoot, relativePath);
  }

  async read(): Promise<TraceGraph> {
    try {
      return traceGraphSchema.parse(
        JSON.parse(await readFile(this.filePath, "utf8")),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return { schemaVersion: 1, links: [] };
      }
      throw error;
    }
  }

  async add(link: TraceLink): Promise<TraceGraph> {
    const validated = traceLinkSchema.parse(link);
    const graph = await this.read();
    if (graph.links.some((candidate) => candidate.id === validated.id)) {
      throw new Error(`Trace link ${validated.id} already exists`);
    }
    const next = traceGraphSchema.parse({
      schemaVersion: 1,
      links: [...graph.links, validated].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    });
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.filePath);
    return next;
  }
}
