import { z } from "zod";

export const legacyVersionSchema = z
  .string()
  .regex(/^0\.(?:[0-6])\.\d+(?:-[0-9A-Za-z.-]+)?$/);

export const migrationArtifactSchema = z
  .object({
    path: z.string().trim().min(1),
    outcome: z.enum(["migrated", "skipped"]),
    reason: z.string().trim().min(1),
  })
  .strict();

export const legacyMigrationPlanSchema = z
  .object({
    sourceVersion: legacyVersionSchema,
    sourceDirectory: z.string().trim().min(1),
    artifacts: z.array(migrationArtifactSchema),
    qualityGates: z.array(
      z
        .object({
          id: z.string().trim().min(1),
          command: z.string().trim().min(1),
          args: z.array(z.string()),
          timeoutMs: z.number().int().positive(),
        })
        .strict(),
    ),
  })
  .strict();

export const legacyMigrationResultSchema = z
  .object({
    status: z.enum(["planned", "migrated"]),
    sourceVersion: legacyVersionSchema,
    backupDirectory: z.string().trim().min(1).nullable(),
    artifacts: z.array(migrationArtifactSchema),
    validation: z.enum(["not-run", "current"]),
  })
  .strict();

export type MigrationArtifact = z.infer<typeof migrationArtifactSchema>;
export type LegacyMigrationPlan = z.infer<typeof legacyMigrationPlanSchema>;
export type LegacyMigrationResult = z.infer<typeof legacyMigrationResultSchema>;
