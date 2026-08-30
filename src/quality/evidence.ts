import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });

export const validationEvidenceSchema = z
  .object({
    id: z.string().regex(/^evidence\.[a-z0-9][a-z0-9._-]*$/),
    gateId: z.string().trim().min(1).max(200),
    status: z.enum(["passed", "failed", "skipped"]),
    severity: z.enum(["required", "advisory"]),
    workId: z.string().trim().min(1).max(200).optional(),
    traceIds: z.array(z.string().trim().min(1).max(200)),
    reason: z.string().trim().min(1).max(4_000),
    capturedAt: timestampSchema,
    revision: z
      .object({
        sha: z.string().trim().min(1),
        dirty: z.boolean(),
      })
      .strict()
      .optional(),
    environment: z
      .object({
        platform: z.string().trim().min(1),
        nodeMajor: z.number().int().positive(),
        ci: z.boolean(),
      })
      .strict()
      .optional(),
    gateDefinitionFingerprint: z.string().trim().min(1).optional(),
  })
  .strict();

export const validationEvidenceStoreSchema = z
  .object({
    schemaVersion: z.literal(1),
    evidence: z.array(validationEvidenceSchema),
  })
  .strict();

export type ValidationEvidence = z.infer<typeof validationEvidenceSchema>;
export type ValidationEvidenceState = z.infer<
  typeof validationEvidenceStoreSchema
>;

export const DEFAULT_EVIDENCE_PATH = ".autoforge/quality/evidence.json";

export class ValidationEvidenceStore {
  private readonly filePath: string;

  constructor(projectRoot: string, relativePath = DEFAULT_EVIDENCE_PATH) {
    this.filePath = path.resolve(projectRoot, relativePath);
  }

  async read(): Promise<ValidationEvidenceState> {
    try {
      return validationEvidenceStoreSchema.parse(
        JSON.parse(await readFile(this.filePath, "utf8")),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return { schemaVersion: 1, evidence: [] };
      }
      throw error;
    }
  }

  async record(evidence: ValidationEvidence): Promise<ValidationEvidenceState> {
    const validated = validationEvidenceSchema.parse(evidence);
    const current = await this.read();
    const next = validationEvidenceStoreSchema.parse({
      schemaVersion: 1,
      evidence: [...current.evidence, validated].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    });
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.filePath);
    return next;
  }
}
