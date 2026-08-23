import { z } from "zod";

import { triageIntentSchema, type TriageIntent } from "./triage.js";
import { READINESS_WORK_KINDS } from "../core/vocabularies.js";

export const readinessWorkKindSchema = z.enum(READINESS_WORK_KINDS);

export const readinessLevelSchema = z.enum([
  "not-ready",
  "needs-input",
  "ready",
]);

export const readinessResultSchema = z
  .object({
    workKind: readinessWorkKindSchema,
    level: readinessLevelSchema,
    confidence: z.number().int().min(0).max(100),
    known: z.array(z.string().trim().min(1)),
    missing: z.array(z.string().trim().min(1)),
    blockers: z.array(z.string().trim().min(1)),
  })
  .strict();

export type ReadinessWorkKind = z.infer<typeof readinessWorkKindSchema>;
export type ReadinessResult = z.infer<typeof readinessResultSchema>;

type EvidenceField = keyof Pick<
  TriageIntent,
  | "objective"
  | "requirements"
  | "unknowns"
  | "constraints"
  | "acceptanceCriteria"
>;

const PROFILES: Record<ReadinessWorkKind, readonly EvidenceField[]> = {
  implementation: ["objective", "requirements", "acceptanceCriteria"],
  research: ["objective", "unknowns"],
  architecture: ["objective", "requirements", "constraints"],
  design: ["objective", "requirements", "acceptanceCriteria"],
  planning: ["objective", "requirements"],
  data: ["objective", "requirements", "constraints"],
  security: ["objective", "requirements", "constraints"],
};

const FIELD_LABELS: Record<EvidenceField, string> = {
  objective: "Objective",
  requirements: "Requirements",
  unknowns: "Research questions",
  constraints: "Constraints",
  acceptanceCriteria: "Acceptance criteria",
};

function present(intent: TriageIntent, field: EvidenceField): boolean {
  const value = intent[field];
  return typeof value === "string"
    ? value.trim().length > 0
    : (value?.length ?? 0) > 0;
}

export function evaluateReadiness(
  input: TriageIntent,
  workKind: ReadinessWorkKind,
): ReadinessResult {
  const intent = triageIntentSchema.parse(input);
  const kind = readinessWorkKindSchema.parse(workKind);
  const required = PROFILES[kind];
  const known = required
    .filter((field) => present(intent, field))
    .map((field) => FIELD_LABELS[field]);
  const missing = required
    .filter((field) => !present(intent, field))
    .map((field) => FIELD_LABELS[field]);
  const blockers =
    kind === "research"
      ? []
      : intent.unknowns.map((unknown) => `Unresolved: ${unknown}`);
  const confidence = Math.round((known.length / required.length) * 100);
  const level =
    missing.length === 0 && blockers.length === 0
      ? "ready"
      : known.length === 0
        ? "not-ready"
        : "needs-input";

  return readinessResultSchema.parse({
    workKind: kind,
    level,
    confidence,
    known,
    missing,
    blockers,
  });
}
