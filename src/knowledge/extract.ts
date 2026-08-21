import {
  createKnowledgeArtifact,
  type KnowledgeArtifact,
  type KnowledgeArtifactKind,
} from "./artifacts.js";

const PREFIXES: Record<string, KnowledgeArtifactKind> = {
  vision: "vision",
  problem: "problem",
  user: "user",
  usecase: "use-case",
  "use-case": "use-case",
  feature: "feature",
  story: "user-story",
  "user-story": "user-story",
  research: "research-question",
  risk: "risk",
  decision: "decision-candidate",
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function extractKnowledgeArtifacts(
  input: string,
  source: string,
  createdAt = new Date(),
): KnowledgeArtifact[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]?\s*([a-z-]+)\s*:\s*(.+?)\s*$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .filter((match) => PREFIXES[match[1]!.toLowerCase()])
    .map((match) => {
      const title = match[2]!;
      const kind = PREFIXES[match[1]!.toLowerCase()]!;
      return createKnowledgeArtifact({
        id: `knowledge.${kind}.${slug(title)}`,
        kind,
        title,
        content: title,
        source,
        createdAt,
      });
    });
}
