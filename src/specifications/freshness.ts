import { createHash } from "node:crypto";

import type { Specification } from "./schemas.js";

export type SpecificationFreshness = "current" | "stale" | "unknown";

export function sourceHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function evaluateSpecificationFreshness(
  specification: Pick<Specification, "provenance">,
  sourceContent?: string,
): SpecificationFreshness {
  const provenance = specification.provenance;
  if (provenance === undefined || sourceContent === undefined) {
    return "unknown";
  }
  if (provenance.sourceHash === undefined) {
    return "unknown";
  }
  return sourceHash(sourceContent) === provenance.sourceHash
    ? "current"
    : "stale";
}
