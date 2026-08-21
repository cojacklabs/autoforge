import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  knowledgeArtifactSchema,
  type KnowledgeArtifact,
} from "./artifacts.js";
import { KnowledgeRegistry, type KnowledgeEdge } from "./registry.js";

interface KnowledgeSnapshot {
  version: "1";
  artifacts: KnowledgeArtifact[];
  relationships: KnowledgeEdge[];
}

export class KnowledgeStore {
  constructor(private readonly projectRoot: string) {}

  private get filePath(): string {
    return path.join(
      path.resolve(this.projectRoot),
      ".autoforge",
      "knowledge",
      "registry.json",
    );
  }

  async save(registry: KnowledgeRegistry): Promise<string> {
    const snapshot: KnowledgeSnapshot = {
      version: "1",
      artifacts: registry.list(),
      relationships: registry.relationships(),
    };
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "utf8",
    );
    return this.filePath;
  }

  async load(): Promise<KnowledgeRegistry> {
    const snapshot = JSON.parse(
      await readFile(this.filePath, "utf8"),
    ) as KnowledgeSnapshot;
    const registry = new KnowledgeRegistry();
    for (const artifact of snapshot.artifacts)
      registry.add(knowledgeArtifactSchema.parse(artifact));
    for (const relationship of snapshot.relationships)
      registry.relate(relationship);
    return registry;
  }
}
