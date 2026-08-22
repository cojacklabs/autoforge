import { describe, expect, it } from "vitest";
import { traceImpact } from "../src/traceability/impact.js";
import type { TraceLink } from "../src/traceability/schemas.js";

const link = (id: string, sourceId: string, targetId: string): TraceLink => ({
  id: `trace.${id}`,
  sourceId,
  targetId,
  relationship: "drives",
  provenance: "test",
  capturedAt: "2026-08-22T00:00:00.000Z",
});

describe("trace impact", () => {
  it("traverses bounded paths deterministically", () => {
    const links = [
      link("a", "intent.checkout", "design.checkout"),
      link("b", "design.checkout", "file.checkout"),
      link("c", "file.checkout", "test.checkout"),
    ];
    expect(
      traceImpact(links, "intent.checkout", {
        direction: "forward",
        maxDepth: 2,
      }),
    ).toMatchObject([
      { artifactId: "design.checkout", depth: 1 },
      { artifactId: "file.checkout", depth: 2 },
    ]);
  });
});
