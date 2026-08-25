import { z } from "zod";

function identifierSchema(prefix: string, example: string) {
  return z
    .string()
    .regex(
      new RegExp(`^${prefix}\\.[a-z0-9][a-z0-9._-]*$`),
      `Expected an identifier such as ${example}`,
    );
}

export const featureIdSchema = identifierSchema("feature", "feature.example");
export const phaseIdSchema = identifierSchema("phase", "phase.example");
export const taskIdSchema = identifierSchema("task", "task.example");
export const issueIdSchema = identifierSchema("issue", "issue.example");
export const workIdSchema = z.union([taskIdSchema, issueIdSchema]);
export const sessionIdSchema = identifierSchema("session", "session.example");
export const assignmentIdSchema = identifierSchema(
  "assignment",
  "assignment.example",
);
export const leaseIdSchema = identifierSchema("lease", "lease.example");
export const gateIdSchema = identifierSchema("gate", "gate.example");
export const eventIdSchema = identifierSchema("event", "event.example");

export type FeatureId = z.infer<typeof featureIdSchema>;
export type PhaseId = z.infer<typeof phaseIdSchema>;
export type TaskId = z.infer<typeof taskIdSchema>;
export type IssueId = z.infer<typeof issueIdSchema>;
export type WorkId = z.infer<typeof workIdSchema>;
