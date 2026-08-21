import {
  knowledgeArtifactSchema,
  type KnowledgeArtifact,
} from "./artifacts.js";

export const KNOWLEDGE_RELATIONS = [
  "derived-from",
  "supports",
  "refines",
  "depends-on",
  "conflicts-with",
] as const;

export type KnowledgeRelation = (typeof KNOWLEDGE_RELATIONS)[number];

export interface KnowledgeEdge {
  from: string;
  relation: KnowledgeRelation;
  to: string;
}

export class KnowledgeRegistry {
  private readonly artifacts = new Map<string, KnowledgeArtifact>();
  private readonly edges: KnowledgeEdge[] = [];

  add(artifact: KnowledgeArtifact): void {
    const parsed = knowledgeArtifactSchema.parse(artifact);
    if (this.artifacts.has(parsed.id)) {
      throw new Error(`Knowledge artifact already exists: ${parsed.id}`);
    }
    this.artifacts.set(parsed.id, parsed);
  }

  get(id: string): KnowledgeArtifact | undefined {
    return this.artifacts.get(id);
  }

  list(): KnowledgeArtifact[] {
    return [...this.artifacts.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  relate(edge: KnowledgeEdge): void {
    if (!this.artifacts.has(edge.from) || !this.artifacts.has(edge.to)) {
      throw new Error("Knowledge relationships require existing artifacts.");
    }
    if (
      this.edges.some(
        (candidate) => JSON.stringify(candidate) === JSON.stringify(edge),
      )
    ) {
      throw new Error("Knowledge relationship already exists.");
    }
    this.edges.push(edge);
  }

  relationships(): KnowledgeEdge[] {
    return this.edges.map((edge) => ({ ...edge }));
  }
}
