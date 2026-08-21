import { z } from "zod";
import { knowledgeArtifactSchema } from "./artifacts.js";
import type { KnowledgeArtifact } from "./artifacts.js";
import type { KnowledgeEdge } from "./registry.js";

const contextRequestSchema = z.object({
  seedIds: z.array(z.string()).min(1),
  maxDepth: z.number().int().nonnegative(),
});

export const contextPacketSchema = z.object({
  protocol: z.literal("autoforge.context.v1"),
  request: contextRequestSchema,
  artifacts: z.array(knowledgeArtifactSchema),
  relationships: z.array(
    z.object({
      from: z.string(),
      relation: z.string(),
      to: z.string(),
    }),
  ),
});

export type ContextPacket = z.infer<typeof contextPacketSchema>;

export function createContextPacket(input: {
  seedIds: string[];
  maxDepth: number;
  artifacts: KnowledgeArtifact[];
  relationships: KnowledgeEdge[];
}): ContextPacket {
  return contextPacketSchema.parse({
    protocol: "autoforge.context.v1",
    request: { seedIds: input.seedIds, maxDepth: input.maxDepth },
    artifacts: input.artifacts,
    relationships: input.relationships,
  });
}

export function serializeContextPacket(packet: ContextPacket): string {
  return `${JSON.stringify(contextPacketSchema.parse(packet), null, 2)}\n`;
}

export function parseContextPacket(serialized: string): ContextPacket {
  return contextPacketSchema.parse(JSON.parse(serialized));
}
