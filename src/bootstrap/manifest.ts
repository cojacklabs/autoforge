import { access, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { workflowRunSchema } from "../workflows/state.js";

export const BOOTSTRAP_ARTIFACT_IDS = [
  "vision",
  "problem",
  "users",
  "use-cases",
  "user-stories",
  "flows",
  "research",
  "architecture",
  "design",
  "data",
  "security",
  "development-plan",
  "tasks",
] as const;

export const bootstrapArtifactIdSchema = z.enum(BOOTSTRAP_ARTIFACT_IDS);

export const bootstrapArtifactSchema = z
  .object({
    id: bootstrapArtifactIdSchema,
    status: z.enum(["planned", "approved"]),
    approvedAt: z.string().datetime({ offset: true }).optional(),
    evidence: z.string().min(1).nullable().optional(),
  })
  .strict();

export const bootstrapManifestSchema = z
  .object({
    version: z.string().min(1),
    report: z.unknown(),
    artifacts: z.array(bootstrapArtifactSchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    const ids = manifest.artifacts.map((artifact) => artifact.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "Bootstrap artifact IDs must be unique",
        path: ["artifacts"],
      });
    }
  });

export type BootstrapArtifactId = z.infer<typeof bootstrapArtifactIdSchema>;
export type BootstrapManifest = z.infer<typeof bootstrapManifestSchema>;

export function bootstrapManifestPath(projectRoot: string): string {
  return path.join(
    path.resolve(projectRoot),
    ".autoforge",
    "bootstrap",
    "manifest.json",
  );
}

export async function readBootstrapManifest(
  projectRoot: string,
): Promise<BootstrapManifest | null> {
  try {
    return bootstrapManifestSchema.parse(
      JSON.parse(
        await readFile(bootstrapManifestPath(projectRoot), "utf8"),
      ) as unknown,
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function validateEvidence(
  projectRoot: string,
  evidence: string,
): Promise<string> {
  const workflowPath = path.join(
    projectRoot,
    ".autoforge",
    "workflows",
    `${evidence}.json`,
  );
  let workflowExists = true;
  try {
    await access(workflowPath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      workflowExists = false;
    } else {
      throw error;
    }
  }
  if (workflowExists) {
    const run = workflowRunSchema.parse(
      JSON.parse(await readFile(workflowPath, "utf8")) as unknown,
    );
    if (run.status !== "completed") {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Workflow ${evidence} is not completed`,
        { exitCode: EXIT_CODE.conflict },
      );
    }
    return path.relative(projectRoot, workflowPath).replaceAll(path.sep, "/");
  }

  const resolved = await resolveContainedProjectPath(projectRoot, evidence);
  await access(resolved.absolutePath);
  if (resolved.relativePath.startsWith(".autoforge/workflows/")) {
    const run = workflowRunSchema.parse(
      JSON.parse(await readFile(resolved.absolutePath, "utf8")) as unknown,
    );
    if (run.status !== "completed") {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Workflow evidence ${evidence} is not completed`,
        { exitCode: EXIT_CODE.conflict },
      );
    }
  }
  return resolved.relativePath;
}

export async function approveBootstrapArtifact(
  projectRoot: string,
  artifactId: BootstrapArtifactId,
  options: { evidence?: string; now?: Date } = {},
): Promise<BootstrapManifest> {
  const id = bootstrapArtifactIdSchema.parse(artifactId);
  const manifest = await readBootstrapManifest(projectRoot);
  if (!manifest) {
    throw new AutoForgeError(
      "INVALID_STATE",
      'Bootstrap manifest is not initialized. Run "autoforge bootstrap scaffold" first.',
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  if (!manifest.artifacts.some((artifact) => artifact.id === id)) {
    throw new AutoForgeError(
      "INVALID_STATE",
      `Bootstrap manifest does not contain ${id}`,
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  const evidence = options.evidence
    ? await validateEvidence(projectRoot, options.evidence)
    : null;
  const approvedAt = (options.now ?? new Date()).toISOString();
  const next = bootstrapManifestSchema.parse({
    ...manifest,
    artifacts: manifest.artifacts.map((artifact) =>
      artifact.id === id
        ? { ...artifact, status: "approved", approvedAt, evidence }
        : artifact,
    ),
  });
  const destination = bootstrapManifestPath(projectRoot);
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
  return next;
}
