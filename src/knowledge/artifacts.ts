import { z } from "zod";

export const knowledgeArtifactKindSchema = z.enum([
  "vision",
  "problem",
  "user",
  "use-case",
  "feature",
  "user-story",
  "research-question",
  "design-concept",
  "architecture-concern",
  "risk",
  "backlog-item",
  "decision-candidate",
]);

export const knowledgeArtifactSchema = z
  .object({
    id: z.string().regex(/^knowledge\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
    kind: knowledgeArtifactKindSchema,
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    source: z.string().trim().min(1),
    createdAt: z.string().datetime({ offset: true }),
    supersedes: z.string().optional(),
  })
  .strict();

export type KnowledgeArtifact = z.infer<typeof knowledgeArtifactSchema>;
export type KnowledgeArtifactKind = z.infer<typeof knowledgeArtifactKindSchema>;

export function createKnowledgeArtifact(input: {
  id: string;
  kind: KnowledgeArtifactKind;
  title: string;
  content: string;
  source: string;
  createdAt?: Date;
  supersedes?: string;
}): KnowledgeArtifact {
  return knowledgeArtifactSchema.parse({
    ...input,
    createdAt: (input.createdAt ?? new Date()).toISOString(),
  });
}
