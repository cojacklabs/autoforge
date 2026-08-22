import { z } from "zod";

import { workScopeSchema } from "../work/schemas.js";

const timestampSchema = z.string().datetime({ offset: true });
const workIdSchema = z.string().regex(/^(task|issue)\.[a-z0-9][a-z0-9._-]*$/);

export const orchestrationRoleSchema = z.enum([
  "product",
  "architecture",
  "design",
  "frontend",
  "backend",
  "security",
  "qa",
  "research",
  "general",
]);

export const orchestrationStageSchema = z.enum([
  "bootstrap",
  "research",
  "planning",
  "design",
  "implementation",
  "test",
  "validation",
  "release",
]);

export const orchestrationRiskSchema = z.enum([
  "low",
  "normal",
  "high",
  "critical",
]);

export const orchestrationNodeSchema = z
  .object({
    workId: workIdSchema,
    objective: z.string().trim().min(1).max(10_000),
    acceptanceCriteria: z.array(z.string().trim().min(1)),
    stage: orchestrationStageSchema,
    role: orchestrationRoleSchema,
    dependencies: z.array(workIdSchema),
    priority: z.number().int().min(0).max(100),
    releaseCritical: z.boolean(),
    risk: orchestrationRiskSchema,
    scope: workScopeSchema,
    requiredCapabilities: z.array(z.string().trim().min(1)),
    status: z.enum(["blocked", "ready", "active", "completed", "canceled"]),
    blockedReasons: z.array(z.string().trim().min(1)),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const orchestrationAssignmentSchema = z
  .object({
    id: z.string().regex(/^assignment\.[a-z0-9][a-z0-9._-]*$/),
    workId: workIdSchema,
    agentId: z.string().trim().min(1),
    role: orchestrationRoleSchema,
    mode: z.enum(["read", "write"]),
    status: z.enum(["active", "completed", "released", "expired"]),
    leaseId: z.string().regex(/^lease\.[a-z0-9][a-z0-9._-]*$/),
    claimedAt: timestampSchema,
    endedAt: timestampSchema.nullable(),
    branch: z.string().min(1).nullable(),
    worktree: z.string().min(1).nullable(),
    contextDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const orchestrationLeaseSchema = z
  .object({
    id: z.string().regex(/^lease\.[a-z0-9][a-z0-9._-]*$/),
    assignmentId: z.string().regex(/^assignment\.[a-z0-9][a-z0-9._-]*$/),
    workId: workIdSchema,
    mode: z.enum(["read", "write"]),
    scope: workScopeSchema,
    acquiredAt: timestampSchema,
    expiresAt: timestampSchema,
    releasedAt: timestampSchema.nullable(),
  })
  .strict();

export const orchestrationGateSchema = z
  .object({
    id: z.string().regex(/^gate\.[a-z0-9][a-z0-9._-]*$/),
    workId: workIdSchema,
    type: z.enum(["architecture", "security", "destructive", "release"]),
    status: z.enum(["pending", "approved", "rejected"]),
    rationale: z.string().trim().min(1),
    createdAt: timestampSchema,
    decidedAt: timestampSchema.nullable(),
    decidedBy: z.string().trim().min(1).nullable(),
  })
  .strict();

export const orchestrationEventSchema = z
  .object({
    id: z.string().regex(/^event\.[a-z0-9][a-z0-9._-]*$/),
    type: z.enum([
      "plan-created",
      "assignment-claimed",
      "assignment-handed-off",
      "assignment-released",
      "lease-expired",
      "gate-approved",
      "gate-rejected",
    ]),
    workId: workIdSchema.nullable(),
    assignmentId: z
      .string()
      .regex(/^assignment\.[a-z0-9][a-z0-9._-]*$/)
      .nullable(),
    message: z.string().trim().min(1),
    createdAt: timestampSchema,
  })
  .strict();

export const orchestrationStateSchema = z
  .object({
    nodes: z.array(orchestrationNodeSchema),
    assignments: z.array(orchestrationAssignmentSchema),
    leases: z.array(orchestrationLeaseSchema),
    gates: z.array(orchestrationGateSchema),
    events: z.array(orchestrationEventSchema),
  })
  .strict()
  .superRefine((state, context) => {
    const nodeIds = new Set(state.nodes.map((node) => node.workId));
    if (nodeIds.size !== state.nodes.length) {
      context.addIssue({
        code: "custom",
        message: "Orchestration work IDs must be unique",
        path: ["nodes"],
      });
    }
    for (const [index, node] of state.nodes.entries()) {
      for (const dependency of node.dependencies) {
        if (!nodeIds.has(dependency)) {
          context.addIssue({
            code: "custom",
            message: `Unknown dependency ${dependency}`,
            path: ["nodes", index, "dependencies"],
          });
        }
        if (dependency === node.workId) {
          context.addIssue({
            code: "custom",
            message: "Work cannot depend on itself",
            path: ["nodes", index, "dependencies"],
          });
        }
      }
    }
  });

export const orchestrationPlanInputSchema = z
  .object({
    nodes: z.array(
      orchestrationNodeSchema.pick({
        workId: true,
        objective: true,
        acceptanceCriteria: true,
        stage: true,
        role: true,
        dependencies: true,
        priority: true,
        releaseCritical: true,
        risk: true,
        scope: true,
        requiredCapabilities: true,
      }),
    ),
  })
  .strict();

export const orchestrationHandoffInputSchema = z
  .object({
    completedWork: z.array(z.string().trim().min(1)).min(1),
    decisions: z.array(z.string().trim().min(1)).default([]),
    openQuestions: z.array(z.string().trim().min(1)).default([]),
    validation: z.array(z.string().trim().min(1)).default([]),
    sourceArtifacts: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export const orchestrationAssignmentPacketSchema = z
  .object({
    assignmentId: orchestrationAssignmentSchema.shape.id,
    workId: workIdSchema,
    objective: z.string().min(1),
    acceptanceCriteria: z.array(z.string().min(1)),
    agentId: z.string().min(1),
    role: orchestrationRoleSchema,
    stage: orchestrationStageSchema,
    allowedFiles: workScopeSchema,
    requiredCapabilities: z.array(z.string().min(1)),
    dependencies: z.array(workIdSchema),
    permittedActions: z.array(z.string().min(1)),
    prohibitedActions: z.array(z.string().min(1)),
    validationRequirements: z.array(z.string().min(1)),
    contextBudget: z.number().int().positive(),
    context: z
      .object({
        content: z.string().trim().min(1).max(1_000_000),
        estimatedTokens: z.number().int().positive(),
        sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
        sources: z.array(
          z
            .object({
              kind: z.enum(["work", "doctrine", "decision", "specification"]),
              id: z.string().min(1),
              reasons: z.array(z.string().min(1)).min(1),
              estimatedTokens: z.number().int().positive(),
            })
            .strict(),
        ),
        exclusions: z.array(
          z
            .object({
              kind: z.enum(["doctrine", "decision", "specification"]),
              id: z.string().min(1),
              reason: z.string().min(1),
              details: z.array(z.string().min(1)),
            })
            .strict(),
        ),
      })
      .strict(),
    createdAt: timestampSchema,
  })
  .strict();

export type OrchestrationRole = z.infer<typeof orchestrationRoleSchema>;
export type OrchestrationNode = z.infer<typeof orchestrationNodeSchema>;
export type OrchestrationState = z.infer<typeof orchestrationStateSchema>;
export type OrchestrationPlanInput = z.infer<
  typeof orchestrationPlanInputSchema
>;
export type OrchestrationHandoffInput = z.infer<
  typeof orchestrationHandoffInputSchema
>;
export type OrchestrationAssignment = z.infer<
  typeof orchestrationAssignmentSchema
>;
export type OrchestrationAssignmentPacket = z.infer<
  typeof orchestrationAssignmentPacketSchema
>;
export type OrchestrationAssignmentContext =
  OrchestrationAssignmentPacket["context"];
