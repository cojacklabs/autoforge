import { z } from "zod";

export const qualityGateStatusSchema = z.enum([
  "pass",
  "warning",
  "fail",
  "skipped",
]);

export const qualityFindingSchema = z
  .object({
    ruleId: z.string().trim().min(1),
    path: z.string().trim().min(1),
    line: z.number().int().positive(),
  })
  .strict();

export const qualityGateCheckSchema = z
  .object({
    id: z.string().trim().min(1),
    status: qualityGateStatusSchema,
    message: z.string().trim().min(1),
    findings: z.array(qualityFindingSchema).default([]),
  })
  .strict();

export const qualityGateReportSchema = z
  .object({
    success: z.boolean(),
    projectRoot: z.string().trim().min(1),
    files: z.array(z.string()),
    checks: z.array(qualityGateCheckSchema).min(1),
  })
  .strict()
  .superRefine((report, context) => {
    const expectedSuccess = report.checks.every(
      (check) => check.status !== "fail",
    );
    if (report.success !== expectedSuccess) {
      context.addIssue({
        code: "custom",
        message: "Quality gate success must match check outcomes",
        path: ["success"],
      });
    }
  });

export type QualityFinding = z.infer<typeof qualityFindingSchema>;
export type QualityGateCheck = z.infer<typeof qualityGateCheckSchema>;
export type QualityGateReport = z.infer<typeof qualityGateReportSchema>;
