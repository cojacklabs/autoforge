import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { approveBootstrapArtifact, bootstrapManifestPath } from "./manifest.js";

export interface VisionApproval {
  idea: string;
  approved: true;
  recordedAt: string;
}

export async function recordVisionApproval(
  projectRoot: string,
  idea: string,
  now = new Date(),
): Promise<string> {
  const directory = path.join(
    path.resolve(projectRoot),
    ".autoforge",
    "bootstrap",
  );
  const approvalPath = path.join(directory, "vision-approvals.json");
  await mkdir(directory, { recursive: true });
  let approvals: VisionApproval[] = [];
  try {
    approvals = JSON.parse(
      await readFile(approvalPath, "utf8"),
    ) as VisionApproval[];
  } catch {
    // First approval creates the record.
  }
  approvals.push({ idea, approved: true, recordedAt: now.toISOString() });
  await writeFile(
    approvalPath,
    `${JSON.stringify(approvals, null, 2)}\n`,
    "utf8",
  );
  try {
    await access(bootstrapManifestPath(projectRoot));
    const visionPath = path.join(path.resolve(projectRoot), "VISION.md");
    let evidence: string | undefined;
    try {
      await access(visionPath);
      evidence = "VISION.md";
    } catch {
      // Legacy vision approvals may not have a generated VISION.md.
    }
    await approveBootstrapArtifact(projectRoot, "vision", {
      ...(evidence ? { evidence } : {}),
      now,
    });
  } catch (error) {
    if (!(
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    )) {
      throw error;
    }
  }
  return approvalPath;
}
