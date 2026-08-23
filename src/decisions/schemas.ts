import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
const searchableTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9._/-]*$/, "Expected a canonical lowercase tag");

export const decisionIdSchema = z
  .string()
  .regex(
    /^decision\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a decision ID such as decision.use-postgres",
  );

export const relatedWorkIdSchema = z
  .string()
  .regex(
    /^(feature|phase|task|issue)\.[a-z0-9][a-z0-9._-]*$/,
    "Expected a feature, phase, task, or issue ID",
  );

export const decisionStatusSchema = z.enum(["active", "superseded", "revoked"]);

export const decisionKindSchema = z
  .enum(["architecture", "bugfix", "feature-note", "skip-reason"])
  .default("architecture");

export const decisionSchema = z
  .object({
    id: decisionIdSchema,
    statement: z.string().trim().min(1).max(2_000),
    reasoning: z.string().trim().min(1).max(20_000),
    consequences: z.array(z.string().trim().min(1).max(2_000)).min(1),
    scope: z.array(searchableTagSchema).min(1),
    keywords: z.array(searchableTagSchema).min(1),
    relatedWork: z.array(relatedWorkIdSchema),
    supersedes: decisionIdSchema.nullable(),
    status: decisionStatusSchema,
    kind: decisionKindSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((decision, context) => {
    for (const [field, values] of [
      ["scope", decision.scope],
      ["keywords", decision.keywords],
      ["relatedWork", decision.relatedWork],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `${field} values must be unique`,
          path: [field],
        });
      }
    }
    if (decision.supersedes === decision.id) {
      context.addIssue({
        code: "custom",
        message: "A decision cannot supersede itself",
        path: ["supersedes"],
      });
    }
    if (Date.parse(decision.updatedAt) < Date.parse(decision.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "A decision cannot be updated before it is created",
        path: ["updatedAt"],
      });
    }
  });

function findSupersessionCycle(
  decisions: ReadonlyArray<z.infer<typeof decisionSchema>>,
): string[] | undefined {
  const byId = new Map(decisions.map((decision) => [decision.id, decision]));
  for (const decision of decisions) {
    const path: string[] = [];
    const visited = new Set<string>();
    let current: z.infer<typeof decisionSchema> | undefined = decision;
    while (current) {
      if (visited.has(current.id)) {
        return [...path, current.id];
      }
      visited.add(current.id);
      path.push(current.id);
      current = current.supersedes ? byId.get(current.supersedes) : undefined;
    }
  }
  return undefined;
}

export const decisionMemorySchema = z
  .object({
    decisions: z.array(decisionSchema),
  })
  .strict()
  .superRefine((memory, context) => {
    const byId = new Map<string, z.infer<typeof decisionSchema>>();
    for (const [index, decision] of memory.decisions.entries()) {
      if (byId.has(decision.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate decision ID: ${decision.id}`,
          path: ["decisions", index, "id"],
        });
      }
      byId.set(decision.id, decision);
    }

    const supersededIds = new Set<string>();
    for (const [index, decision] of memory.decisions.entries()) {
      if (decision.supersedes === null) {
        continue;
      }
      const target = byId.get(decision.supersedes);
      if (!target) {
        context.addIssue({
          code: "custom",
          message: `Unknown superseded decision: ${decision.supersedes}`,
          path: ["decisions", index, "supersedes"],
        });
        continue;
      }
      if (target.status !== "superseded") {
        context.addIssue({
          code: "custom",
          message: `Superseded decision ${target.id} must have superseded status`,
          path: ["decisions", index, "supersedes"],
        });
      }
      if (supersededIds.has(target.id)) {
        context.addIssue({
          code: "custom",
          message: `Decision ${target.id} is superseded more than once`,
          path: ["decisions", index, "supersedes"],
        });
      }
      supersededIds.add(target.id);
    }

    for (const [index, decision] of memory.decisions.entries()) {
      if (decision.status === "superseded" && !supersededIds.has(decision.id)) {
        context.addIssue({
          code: "custom",
          message: `Superseded decision ${decision.id} requires a replacement`,
          path: ["decisions", index, "status"],
        });
      }
    }

    const cycle = findSupersessionCycle(memory.decisions);
    if (cycle) {
      context.addIssue({
        code: "custom",
        message: `Decision supersession cycle: ${cycle.join(" -> ")}`,
        path: ["decisions"],
      });
    }
  });

export type DecisionStatus = z.infer<typeof decisionStatusSchema>;
export type DecisionKind = z.infer<typeof decisionKindSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type DecisionMemory = z.infer<typeof decisionMemorySchema>;
