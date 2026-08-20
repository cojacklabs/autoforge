import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
const entityNameSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().trim().min(1).max(10_000);

function entityIdSchema(kind: "feature" | "phase" | "task" | "issue") {
  return z
    .string()
    .regex(
      new RegExp(`^${kind}\\.[a-z0-9][a-z0-9._-]*$`),
      `Expected a ${kind} ID such as ${kind}.example`,
    );
}

function isRepositoryRelativePattern(value: string): boolean {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value)
  ) {
    return false;
  }

  return !value
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => segment === "..");
}

export const workStatusSchema = z.enum([
  "planned",
  "ready",
  "active",
  "blocked",
  "completed",
  "canceled",
]);

export const workScopeSchema = z
  .object({
    include: z
      .array(
        z.string().trim().min(1).refine(isRepositoryRelativePattern, {
          message: "Scope patterns must be repository-relative",
        }),
      )
      .min(1),
    exclude: z
      .array(
        z.string().trim().min(1).refine(isRepositoryRelativePattern, {
          message: "Scope patterns must be repository-relative",
        }),
      )
      .default([]),
  })
  .strict();

const workItemBaseSchema = z
  .object({
    name: entityNameSchema,
    description: descriptionSchema,
    status: workStatusSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const featureSchema = workItemBaseSchema.extend({
  id: entityIdSchema("feature"),
});

export const phaseSchema = workItemBaseSchema.extend({
  id: entityIdSchema("phase"),
  featureId: entityIdSchema("feature"),
  sequence: z.number().int().positive(),
});

export const taskSchema = workItemBaseSchema.extend({
  id: entityIdSchema("task"),
  phaseId: entityIdSchema("phase"),
  scope: workScopeSchema,
});

export const issueSchema = workItemBaseSchema.extend({
  id: entityIdSchema("issue"),
  scope: workScopeSchema,
});

export const activeWorkSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("task"),
      id: entityIdSchema("task"),
      startedAt: timestampSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("issue"),
      id: entityIdSchema("issue"),
      startedAt: timestampSchema,
    })
    .strict(),
]);

function duplicateIds(values: ReadonlyArray<{ id: string }>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      duplicates.add(value.id);
    }
    seen.add(value.id);
  }
  return [...duplicates];
}

export const workStateSchema = z
  .object({
    features: z.array(featureSchema),
    phases: z.array(phaseSchema),
    tasks: z.array(taskSchema),
    issues: z.array(issueSchema),
    activeWork: activeWorkSchema.nullable(),
  })
  .strict()
  .superRefine((state, context) => {
    for (const [collection, values] of [
      ["features", state.features],
      ["phases", state.phases],
      ["tasks", state.tasks],
      ["issues", state.issues],
    ] as const) {
      for (const id of duplicateIds(values)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate work ID: ${id}`,
          path: [collection],
        });
      }
    }

    const featureIds = new Set(state.features.map((feature) => feature.id));
    const phaseSequences = new Set<string>();
    for (const [index, phase] of state.phases.entries()) {
      if (!featureIds.has(phase.featureId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown feature: ${phase.featureId}`,
          path: ["phases", index, "featureId"],
        });
      }
      const sequenceKey = `${phase.featureId}:${phase.sequence}`;
      if (phaseSequences.has(sequenceKey)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate phase sequence ${phase.sequence} for ${phase.featureId}`,
          path: ["phases", index, "sequence"],
        });
      }
      phaseSequences.add(sequenceKey);
    }

    const phaseIds = new Set(state.phases.map((phase) => phase.id));
    for (const [index, task] of state.tasks.entries()) {
      if (!phaseIds.has(task.phaseId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown phase: ${task.phaseId}`,
          path: ["tasks", index, "phaseId"],
        });
      }
    }

    const activeCandidates = [...state.tasks, ...state.issues].filter(
      (item) => item.status === "active",
    );
    if (activeCandidates.length > 1) {
      context.addIssue({
        code: "custom",
        message: "Only one task or issue may be active",
        path: ["activeWork"],
      });
    }

    if (state.activeWork === null) {
      if (activeCandidates.length > 0) {
        context.addIssue({
          code: "custom",
          message: "Active status requires an activeWork reference",
          path: ["activeWork"],
        });
      }
      return;
    }

    const collection =
      state.activeWork.kind === "task" ? state.tasks : state.issues;
    const referencedWork = collection.find(
      (item) => item.id === state.activeWork?.id,
    );
    if (!referencedWork) {
      context.addIssue({
        code: "custom",
        message: `Unknown active ${state.activeWork.kind}: ${state.activeWork.id}`,
        path: ["activeWork", "id"],
      });
    } else if (referencedWork.status !== "active") {
      context.addIssue({
        code: "custom",
        message: "The referenced active work must have active status",
        path: ["activeWork", "id"],
      });
    }
  });

export const sessionSchema = z
  .object({
    id: z.string().regex(/^session\.[a-z0-9][a-z0-9._-]*$/),
    status: z.enum(["active", "ended"]),
    startedAt: timestampSchema,
    endedAt: timestampSchema.nullable(),
    activeWork: activeWorkSchema.nullable(),
  })
  .strict()
  .superRefine((session, context) => {
    if (session.status === "active" && session.endedAt !== null) {
      context.addIssue({
        code: "custom",
        message: "An active session cannot have an end timestamp",
        path: ["endedAt"],
      });
    }
    if (session.status === "ended" && session.endedAt === null) {
      context.addIssue({
        code: "custom",
        message: "An ended session requires an end timestamp",
        path: ["endedAt"],
      });
    }
    if (
      session.endedAt !== null &&
      Date.parse(session.endedAt) < Date.parse(session.startedAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "A session cannot end before it starts",
        path: ["endedAt"],
      });
    }
    if (
      session.activeWork !== null &&
      session.activeWork.startedAt !== session.startedAt
    ) {
      context.addIssue({
        code: "custom",
        message: "Session and active work must share a start timestamp",
        path: ["activeWork", "startedAt"],
      });
    }
  });

export const sessionStateSchema = z
  .object({
    current: sessionSchema.nullable(),
    previous: z.array(sessionSchema),
  })
  .strict()
  .superRefine((state, context) => {
    if (state.current?.status === "ended") {
      context.addIssue({
        code: "custom",
        message: "The current session must be active",
        path: ["current", "status"],
      });
    }
    for (const [index, session] of state.previous.entries()) {
      if (session.status !== "ended") {
        context.addIssue({
          code: "custom",
          message: "Previous sessions must be ended",
          path: ["previous", index, "status"],
        });
      }
    }
    const sessionIds = [
      ...(state.current ? [state.current.id] : []),
      ...state.previous.map((session) => session.id),
    ];
    for (const id of duplicateIds(sessionIds.map((id) => ({ id })))) {
      context.addIssue({
        code: "custom",
        message: `Duplicate session ID: ${id}`,
        path: ["previous"],
      });
    }
  });

export type WorkStatus = z.infer<typeof workStatusSchema>;
export type WorkScope = z.infer<typeof workScopeSchema>;
export type Feature = z.infer<typeof featureSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type ActiveWork = z.infer<typeof activeWorkSchema>;
export type WorkState = z.infer<typeof workStateSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
