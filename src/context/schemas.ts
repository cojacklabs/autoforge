import { z } from "zod";

import { decisionSchema } from "../decisions/schemas.js";
import { doctrineSchema } from "../doctrine/schemas.js";
import { specificationSchema } from "../specifications/schemas.js";
import {
  featureSchema,
  issueSchema,
  phaseSchema,
  taskSchema,
} from "../work/schemas.js";

const selectionMetadataSchema = z
  .object({
    score: z.number().int().nonnegative(),
    reasons: z.array(z.string().trim().min(1)).min(1),
    estimatedTokens: z.number().int().positive(),
  })
  .strict();

export const contextWorkSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("task"),
      item: taskSchema,
      phase: phaseSchema,
      feature: featureSchema,
      startedAt: z.string().datetime({ offset: true }),
      objective: z.string().trim().min(1).max(30_000),
      reasons: z.array(z.string().trim().min(1)).min(1),
      estimatedTokens: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("issue"),
      item: issueSchema,
      startedAt: z.string().datetime({ offset: true }),
      objective: z.string().trim().min(1).max(30_000),
      reasons: z.array(z.string().trim().min(1)).min(1),
      estimatedTokens: z.number().int().positive(),
    })
    .strict(),
]);

export const doctrineRefSchema = selectionMetadataSchema.extend({
  doctrine: doctrineSchema,
});

export const decisionRefSchema = selectionMetadataSchema.extend({
  decision: decisionSchema,
});

export const specificationRefSchema = selectionMetadataSchema.extend({
  specification: specificationSchema,
});

export const contextExclusionSchema = z
  .object({
    kind: z.enum(["doctrine", "decision", "specification"]),
    id: z.string().trim().min(1).max(200),
    reason: z.enum([
      "not-relevant",
      "budget-exceeded",
      "inactive",
      "unresolved-reference",
    ]),
    details: z.array(z.string().trim().min(1)),
    estimatedTokens: z.number().int().positive().optional(),
  })
  .strict();

export const contextBudgetSummarySchema = z
  .object({
    maxTokens: z.number().int().positive(),
    usedTokens: z.number().int().positive(),
    remainingTokens: z.number().int().nonnegative(),
    exceeded: z.boolean(),
  })
  .strict();

export const contextSelectionSchema = z
  .object({
    work: contextWorkSchema,
    doctrines: z.array(doctrineRefSchema),
    decisions: z.array(decisionRefSchema),
    specs: z.array(specificationRefSchema),
    exclusions: z.array(contextExclusionSchema),
    budget: contextBudgetSummarySchema,
    workflow: z
      .object({
        kind: z.string().min(1),
        currentStage: z.string().min(1),
        status: z.enum(["active", "completed"]),
        handoffIds: z.array(z.string().min(1)),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((selection, context) => {
    const usedTokens =
      selection.work.estimatedTokens +
      selection.doctrines.reduce(
        (total, reference) => total + reference.estimatedTokens,
        0,
      ) +
      selection.decisions.reduce(
        (total, reference) => total + reference.estimatedTokens,
        0,
      ) +
      selection.specs.reduce(
        (total, reference) => total + reference.estimatedTokens,
        0,
      );
    if (selection.budget.usedTokens !== usedTokens) {
      context.addIssue({
        code: "custom",
        message: "Budget usage must equal selected context token estimates",
        path: ["budget", "usedTokens"],
      });
    }
    const remainingTokens = Math.max(
      0,
      selection.budget.maxTokens - usedTokens,
    );
    if (selection.budget.remainingTokens !== remainingTokens) {
      context.addIssue({
        code: "custom",
        message: "Remaining budget is inconsistent with token usage",
        path: ["budget", "remainingTokens"],
      });
    }
    if (selection.budget.exceeded !== usedTokens > selection.budget.maxTokens) {
      context.addIssue({
        code: "custom",
        message: "Exceeded flag is inconsistent with token usage",
        path: ["budget", "exceeded"],
      });
    }

    for (const [path, ids] of [
      ["doctrines", selection.doctrines.map(({ doctrine }) => doctrine.id)],
      ["decisions", selection.decisions.map(({ decision }) => decision.id)],
      ["specs", selection.specs.map(({ specification }) => specification.id)],
    ] as const) {
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          message: "Selected context references must be unique",
          path: [path],
        });
      }
    }
  });

export type ContextWork = z.infer<typeof contextWorkSchema>;
export type DoctrineRef = z.infer<typeof doctrineRefSchema>;
export type DecisionRef = z.infer<typeof decisionRefSchema>;
export type SpecificationRef = z.infer<typeof specificationRefSchema>;
export type ContextExclusion = z.infer<typeof contextExclusionSchema>;
export type ContextSelection = z.infer<typeof contextSelectionSchema>;
