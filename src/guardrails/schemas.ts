import { z } from "zod";

export const guardrailEnforcementSchema = z.enum(["advisory", "hard"]);

export const guardrailCheckSchema = z
  .object({
    id: z.enum([
      "active-work",
      "session-consistency",
      "doctrine-requirements",
      "context-current",
      "scope-boundary",
    ]),
    status: z.enum(["pass", "warn", "fail"]),
    message: z.string().trim().min(1).max(2_000),
  })
  .strict();

export const guardrailReportSchema = z
  .object({
    allowed: z.boolean(),
    enforcement: guardrailEnforcementSchema,
    agentId: z.string().trim().min(1).max(80).nullable(),
    workId: z.string().trim().min(1).max(200).nullable(),
    targetPath: z.string().trim().min(1).max(1_000).nullable(),
    checks: z.array(guardrailCheckSchema).min(5).max(5),
  })
  .strict()
  .superRefine((report, context) => {
    const hasFailure = report.checks.some((check) => check.status === "fail");
    if (report.allowed === hasFailure) {
      context.addIssue({
        code: "custom",
        message: "Guardrail allowed status must reflect failed checks",
        path: ["allowed"],
      });
    }
    const ids = report.checks.map((check) => check.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "Guardrail check IDs must be unique",
        path: ["checks"],
      });
    }
  });

export type GuardrailEnforcement = z.infer<typeof guardrailEnforcementSchema>;
export type GuardrailCheck = z.infer<typeof guardrailCheckSchema>;
export type GuardrailReport = z.infer<typeof guardrailReportSchema>;
