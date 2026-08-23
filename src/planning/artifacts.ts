import { createHash } from "node:crypto";

import { z } from "zod";

import { triageIntentSchema, type TriageIntent } from "../intent/triage.js";

export const planningArtifactKindSchema = z.enum([
  "feature-brief",
  "technical-plan",
  "design-brief",
  "user-stories",
  "acceptance-criteria",
]);

export const planningArtifactSchema = z
  .object({
    kind: planningArtifactKindSchema,
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    generatorVersion: z.string().min(1),
    generatedAt: z.string().datetime({ offset: true }),
    content: z.string().trim().min(1),
  })
  .strict();

export type PlanningArtifactKind = z.infer<typeof planningArtifactKindSchema>;
export type PlanningArtifact = z.infer<typeof planningArtifactSchema>;

const GENERATOR_VERSION = "0.8.0-planning.1";

function fingerprint(intent: TriageIntent): string {
  return createHash("sha256").update(JSON.stringify(intent)).digest("hex");
}

function list(values: readonly string[], empty = "- None recorded."): string {
  return values.length > 0
    ? values.map((value) => `- ${value}`).join("\n")
    : empty;
}

function toStoryFragment(requirement: string): string {
  const trimmed = requirement.trim().replace(/[.!?]+$/, "");
  const [firstWord] = trimmed.split(/\s+/, 1);
  const looksLikeAcronym =
    firstWord !== undefined &&
    firstWord.length > 1 &&
    firstWord === firstWord.toUpperCase();
  if (looksLikeAcronym || trimmed.length === 0) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function render(kind: PlanningArtifactKind, intent: TriageIntent): string {
  const objective = intent.objective ?? "Objective not yet specified.";
  switch (kind) {
    case "feature-brief":
      return `# Feature Brief\n\n## Objective\n${objective}\n\n## Requirements\n${list(intent.requirements)}\n\n## Constraints\n${list(intent.constraints)}`;
    case "technical-plan":
      return `# Technical Plan\n\n## Objective\n${objective}\n\n## Assumptions\n${list(intent.assumptions)}\n\n## Unknowns\n${list(intent.unknowns)}`;
    case "design-brief":
      return `# Design Brief\n\n## Objective\n${objective}\n\n## Requirements\n${list(intent.requirements)}\n\n## Constraints\n${list(intent.constraints)}`;
    case "user-stories": {
      if (intent.requirements.length === 0) {
        return "# User Stories\n\n- User stories require structured requirements.";
      }
      const stories = intent.requirements
        .map(
          (requirement) =>
            `- As a user, I want ${toStoryFragment(requirement)}.`,
        )
        .join("\n");
      return `# User Stories\n\nEach story below works toward: ${objective}\n\n${stories}`;
    }
    case "acceptance-criteria":
      return `# Acceptance Criteria\n\n${list(intent.acceptanceCriteria, "- Acceptance criteria have not been defined.")}`;
  }
}

export function generatePlanningArtifact(
  input: TriageIntent,
  kind: PlanningArtifactKind,
  now: Date = new Date(),
): PlanningArtifact {
  const intent = triageIntentSchema.parse(input);
  const artifactKind = planningArtifactKindSchema.parse(kind);
  return planningArtifactSchema.parse({
    kind: artifactKind,
    sourceFingerprint: fingerprint(intent),
    generatorVersion: GENERATOR_VERSION,
    generatedAt: now.toISOString(),
    content: render(artifactKind, intent),
  });
}

export function isPlanningArtifactFresh(
  artifact: PlanningArtifact,
  input: TriageIntent,
): boolean {
  const intent = triageIntentSchema.parse(input);
  return artifact.sourceFingerprint === fingerprint(intent);
}
