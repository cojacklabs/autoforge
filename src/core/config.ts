import { z } from "zod";

import { AutoForgeError, EXIT_CODE } from "./errors.js";

export const CONFIG_SCHEMA_VERSION = 1;
export const DEFAULT_CONTEXT_BUDGET_TOKENS = 12_000;

export const artifactGitPolicySchema = z.enum(["tracked", "ignored"]);

export const qualityGateCommandSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
    command: z.string().trim().min(1).max(256),
    args: z.array(z.string().max(2_048)).max(64).default([]),
    timeoutMs: z
      .number()
      .int()
      .min(1_000)
      .max(30 * 60 * 1_000)
      .default(120_000),
  })
  .strict();

export const configSchema = z
  .object({
    schemaVersion: z.literal(CONFIG_SCHEMA_VERSION),
    projectId: z.uuid(),
    contextBudget: z
      .object({
        maxTokens: z.number().int().min(1_000).max(1_000_000),
      })
      .strict(),
    defaultAgent: z.string().trim().min(1).optional(),
    qualityGates: z.array(qualityGateCommandSchema).max(32).default([]),
    artifacts: z
      .object({
        work: artifactGitPolicySchema,
        decisions: artifactGitPolicySchema,
        doctrines: artifactGitPolicySchema,
        specifications: artifactGitPolicySchema,
        sessions: artifactGitPolicySchema,
        packets: artifactGitPolicySchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((config, context) => {
    const gateIds = new Set<string>();
    for (const [index, gate] of config.qualityGates.entries()) {
      if (gateIds.has(gate.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate quality gate id: ${gate.id}`,
          path: ["qualityGates", index, "id"],
        });
      }
      gateIds.add(gate.id);
    }
  });

export type ArtifactGitPolicy = z.infer<typeof artifactGitPolicySchema>;
export type QualityGateCommand = z.infer<typeof qualityGateCommandSchema>;
export type AutoForgeConfig = z.infer<typeof configSchema>;

export function createDefaultConfig(projectId: string): AutoForgeConfig {
  return parseConfig({
    schemaVersion: CONFIG_SCHEMA_VERSION,
    projectId,
    contextBudget: {
      maxTokens: DEFAULT_CONTEXT_BUDGET_TOKENS,
    },
    qualityGates: [],
    artifacts: {
      work: "tracked",
      decisions: "tracked",
      doctrines: "tracked",
      specifications: "tracked",
      sessions: "ignored",
      packets: "ignored",
    },
  });
}

export function parseConfig(value: unknown): AutoForgeConfig {
  const result = configSchema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  throw new AutoForgeError("INVALID_CONFIG", "Invalid AutoForge config", {
    details: {
      issues: result.error.issues,
    },
    exitCode: EXIT_CODE.invalidState,
  });
}
