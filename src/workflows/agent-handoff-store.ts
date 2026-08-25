import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  agentHandoffSchema,
  type AgentHandoff,
} from "@cojacklabs/autoforge-protocol";
import type { AgentHandoffRepository } from "@cojacklabs/autoforge-core";

export const DEFAULT_AGENT_HANDOFF_DIRECTORY = ".autoforge/handoffs";

export class FileAgentHandoffRepository implements AgentHandoffRepository {
  private readonly directory: string;

  constructor(
    projectRoot: string,
    relativeDirectory = DEFAULT_AGENT_HANDOFF_DIRECTORY,
  ) {
    this.directory = path.resolve(projectRoot, relativeDirectory);
  }

  async write(handoff: AgentHandoff): Promise<string> {
    const validated = agentHandoffSchema.parse(handoff);
    await mkdir(this.directory, { recursive: true });
    const filePath = this.pathFor(validated.id);
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, filePath);
    return filePath;
  }

  async read(id: string): Promise<AgentHandoff | null> {
    try {
      return agentHandoffSchema.parse(
        JSON.parse(await readFile(this.pathFor(id), "utf8")),
      );
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        return null;
      throw error;
    }
  }

  async list(): Promise<AgentHandoff[]> {
    let entries: string[];
    try {
      entries = await readdir(this.directory);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        return [];
      throw error;
    }
    const handoffs = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .sort()
        .map(async (entry) =>
          agentHandoffSchema.parse(
            JSON.parse(
              await readFile(path.join(this.directory, entry), "utf8"),
            ),
          ),
        ),
    );
    return handoffs.sort((left, right) =>
      left.createdAt === right.createdAt
        ? left.id.localeCompare(right.id)
        : left.createdAt.localeCompare(right.createdAt),
    );
  }

  private pathFor(id: string): string {
    const safeId = /^handoff\.[a-z0-9][a-z0-9._-]*$/.test(id)
      ? id
      : agentHandoffSchema.shape.id.parse(id);
    return path.join(this.directory, `${safeId}.json`);
  }
}
