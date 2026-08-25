import { z } from "zod";

import { workIdSchema } from "./identifiers.js";

const timestampSchema = z.string().datetime({ offset: true });
const fingerprintSchema = z.string().regex(/^[a-f0-9]{64}$/);

function isRepositoryRelative(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return (
    !normalized.startsWith("/") &&
    !/^[A-Za-z]:\//.test(normalized) &&
    !normalized.split("/").includes("..")
  );
}

export const repositoryRelativeScopePatternSchema = z
  .string()
  .trim()
  .min(1)
  .max(1_000)
  .refine(isRepositoryRelative, {
    message: "Scope patterns must be repository-relative",
  });

const projectRelativePathSchema = z
  .string()
  .min(1)
  .max(1_000)
  .refine(isRepositoryRelative, {
    message: "Changed files must use contained project-relative paths",
  });

export const agentHandoffSchema = z
  .object({
    protocolVersion: z.literal("1").default("1"),
    id: z.string().regex(/^handoff\.[a-z0-9][a-z0-9._-]*$/),
    project: z
      .object({
        id: z.string().min(1).max(200),
        name: z.string().min(1).max(200),
      })
      .strict(),
    session: z
      .object({
        id: z.string().min(1).max(200),
        fromAgent: z.string().min(1).max(80),
        toAgent: z.string().min(1).max(80),
      })
      .strict(),
    activeWork: z
      .object({
        kind: z.enum(["task", "issue"]),
        id: workIdSchema,
        name: z.string().min(1).max(300),
        objective: z.string().min(1).max(4_000),
      })
      .strict(),
    scope: z
      .object({
        include: z.array(repositoryRelativeScopePatternSchema),
        exclude: z.array(repositoryRelativeScopePatternSchema),
      })
      .strict(),
    git: z
      .object({
        head: z.string().min(1).max(200),
        base: z.string().min(1).max(200).optional(),
        branch: z.string().min(1).max(300).optional(),
      })
      .strict(),
    changedFiles: z.array(
      z
        .object({
          path: projectRelativePathSchema,
          status: z.enum([
            "added",
            "modified",
            "deleted",
            "renamed",
            "untracked",
          ]),
        })
        .strict(),
    ),
    decisions: z.array(
      z
        .object({
          id: z.string().regex(/^decision\.[a-z0-9][a-z0-9._-]*$/),
          statement: z.string().min(1).max(4_000),
        })
        .strict(),
    ),
    validation: z.array(
      z
        .object({
          gateId: z.string().min(1).max(200),
          status: z.enum(["passed", "failed", "skipped"]),
          summary: z.string().min(1).max(4_000),
        })
        .strict(),
    ),
    risks: z.array(z.string().min(1).max(4_000)),
    openQuestions: z.array(z.string().min(1).max(4_000)),
    nextAction: z.string().min(1).max(4_000),
    contextFingerprint: fingerprintSchema,
    createdAt: timestampSchema,
  })
  .strict()
  .superRefine((handoff, context) => {
    if (handoff.session.fromAgent === handoff.session.toAgent) {
      context.addIssue({
        code: "custom",
        message:
          "Cross-agent handoffs require different source and target agents",
        path: ["session", "toAgent"],
      });
    }
    const paths = handoff.changedFiles.map((file) => file.path);
    if (new Set(paths).size !== paths.length) {
      context.addIssue({
        code: "custom",
        message: "Changed file paths must be unique",
        path: ["changedFiles"],
      });
    }
  });

export type AgentHandoff = z.infer<typeof agentHandoffSchema>;
export type CreateAgentHandoffInput = Omit<
  AgentHandoff,
  "protocolVersion" | "createdAt"
>;

export function createAgentHandoff(
  input: CreateAgentHandoffInput,
  now = new Date(),
): AgentHandoff {
  return agentHandoffSchema.parse({
    ...input,
    protocolVersion: "1",
    createdAt: now.toISOString(),
  });
}
