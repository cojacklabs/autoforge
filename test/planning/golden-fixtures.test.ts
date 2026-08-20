import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { triageIntent } from "../../src/intent/triage.js";
import {
  generatePlanningArtifact,
  planningArtifactSchema,
} from "../../src/planning/artifacts.js";
import { specificationSchema } from "../../src/specifications/schemas.js";

const fixture = (name: string) =>
  path.join(process.cwd(), "test", "fixtures", name);

describe("golden v0.8 fixtures", () => {
  it("keeps canonical intent triage stable", async () => {
    const intent = JSON.parse(
      await readFile(fixture("intent/checkout.json"), "utf8"),
    ) as never;
    expect(triageIntent(intent).labels).toEqual(["READY_FOR_IMPLEMENTATION"]);
  });

  it("keeps canonical research schema valid", async () => {
    const research = JSON.parse(
      await readFile(fixture("research/payment-provider.json"), "utf8"),
    );
    expect(specificationSchema.parse(research).knowledge?.kind).toBe(
      "research",
    );
  });

  it("keeps canonical planning output stable", async () => {
    const intent = JSON.parse(
      await readFile(fixture("intent/checkout.json"), "utf8"),
    ) as never;
    const artifact = generatePlanningArtifact(
      intent,
      "feature-brief",
      new Date("2026-08-20T00:00:00.000Z"),
    );
    expect(artifact.content).toContain(
      "Allow customers to complete card payments.",
    );
    expect(artifact.generatorVersion).toBe("0.8.0-planning.1");
    const stored = JSON.parse(
      await readFile(fixture("planning/feature-brief.json"), "utf8"),
    );
    expect(planningArtifactSchema.parse(stored).kind).toBe("feature-brief");
  });
});
