import { z } from "zod";
import { repositoryRelativeScopePatternSchema } from "./handoff.js";
import { workIdSchema } from "./identifiers.js";

export const projectArtifactKindSchema = z.enum([
  "brainstorm",
  "research",
  "requirements",
  "plan",
  "architecture",
  "design",
  "validation",
  "review",
  "handoff",
]);
export const projectArtifactIdSchema = z
  .string()
  .regex(/^artifact\.[a-z0-9][a-z0-9._-]*$/);
export const projectArtifactSchema = z
  .object({
    schemaVersion: z.literal("1"),
    id: projectArtifactIdSchema,
    kind: projectArtifactKindSchema,
    title: z.string().trim().min(1).max(300),
    status: z.enum(["draft", "approved", "superseded"]),
    agentId: z.string().trim().min(1).max(80),
    workId: workIdSchema,
    createdAt: z.string().datetime({ offset: true }),
    sourceRevision: z
      .object({
        gitHead: z.string().trim().min(1).max(200),
        dirtyFingerprint: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable(),
      })
      .strict(),
    content: z.discriminatedUnion("type", [
      z
        .object({
          type: z.literal("inline"),
          mediaType: z.enum(["text/markdown", "application/json"]),
          value: z.string().trim().min(1),
        })
        .strict(),
      z
        .object({
          type: z.literal("reference"),
          path: repositoryRelativeScopePatternSchema,
        })
        .strict(),
    ]),
    approval: z
      .object({
        approvedBy: z.string().trim().min(1),
        approvedAt: z.string().datetime({ offset: true }),
      })
      .strict()
      .nullable(),
    supersedes: projectArtifactIdSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.status === "draft") === (value.approval !== null))
      context.addIssue({
        code: "custom",
        message: "Approved and superseded artifacts require approval metadata",
        path: ["approval"],
      });
    if (value.supersedes === value.id)
      context.addIssue({
        code: "custom",
        message: "An artifact cannot supersede itself",
        path: ["supersedes"],
      });
  });
export type ProjectArtifact = z.infer<typeof projectArtifactSchema>;
