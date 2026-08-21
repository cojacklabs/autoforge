import { describe, expect, it } from "vitest";
import { createKnowledgeArtifact } from "../src/knowledge/artifacts.js";
import {
  createContextPacket,
  parseContextPacket,
  serializeContextPacket,
} from "../src/knowledge/protocol.js";

describe("knowledge context protocol", () => {
  it("round-trips a vendor-neutral context packet", () => {
    const artifact = createKnowledgeArtifact({
      id: "knowledge.vision.product",
      kind: "vision",
      title: "Product direction",
      content: "Durable project memory",
      source: "test",
      createdAt: new Date("2026-08-21T00:00:00.000Z"),
    });
    const packet = createContextPacket({
      seedIds: [artifact.id],
      maxDepth: 1,
      artifacts: [artifact],
      relationships: [],
    });
    expect(parseContextPacket(serializeContextPacket(packet))).toEqual(packet);
  });
});
