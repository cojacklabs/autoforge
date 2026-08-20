import { z } from "zod";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";

export const STATE_SCHEMA_VERSION = 1;

export const stateEnvelopeBaseSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    revision: z.number().int().nonnegative(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export function createStateEnvelopeSchema<DataSchema extends z.ZodType>(
  dataSchema: DataSchema,
) {
  return z
    .object({
      schemaVersion: z.number().int().positive(),
      revision: z.number().int().nonnegative(),
      updatedAt: z.string().datetime({ offset: true }),
      data: dataSchema,
    })
    .strict();
}

export const projectMetadataSchema = z
  .object({
    projectId: z.uuid(),
    initializedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const projectMetadataEnvelopeSchema = createStateEnvelopeSchema(
  projectMetadataSchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export type StateEnvelope<Data> = {
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  data: Data;
};

export type ProjectMetadata = z.infer<typeof projectMetadataSchema>;
export type ProjectMetadataEnvelope = z.infer<
  typeof projectMetadataEnvelopeSchema
>;

export function parseStateEnvelope<DataSchema extends z.ZodType>(
  schema: ReturnType<typeof createStateEnvelopeSchema<DataSchema>>,
  value: unknown,
): z.infer<typeof schema> {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  throw new AutoForgeError("INVALID_STATE", "Invalid AutoForge state", {
    details: {
      issues: result.error.issues,
    },
    exitCode: EXIT_CODE.invalidState,
  });
}

export function createProjectMetadataEnvelope(
  projectId: string,
  timestamp: string,
): ProjectMetadataEnvelope {
  return parseProjectMetadataEnvelope({
    schemaVersion: STATE_SCHEMA_VERSION,
    revision: 0,
    updatedAt: timestamp,
    data: {
      projectId,
      initializedAt: timestamp,
    },
  });
}

export function parseProjectMetadataEnvelope(
  value: unknown,
): ProjectMetadataEnvelope {
  const result = projectMetadataEnvelopeSchema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  throw new AutoForgeError("INVALID_STATE", "Invalid project metadata state", {
    details: {
      issues: result.error.issues,
    },
    exitCode: EXIT_CODE.invalidState,
  });
}
