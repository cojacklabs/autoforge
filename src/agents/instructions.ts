import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import type { AgentAdapterContext } from "./adapter.js";

export interface ManagedInstructionBlock {
  fileName: string;
  startMarker: string;
  endMarker: string;
  content: string;
}

export type ManagedInstructionStatus =
  "absent" | "configured" | "outdated" | "malformed";

export async function resolveAgentPath(
  context: AgentAdapterContext,
  projectRelativePath: string,
): Promise<string> {
  const resolved = await resolveContainedProjectPath(
    context.projectRoot,
    projectRelativePath,
  );
  return resolved.absolutePath;
}

export async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await lstat(candidatePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function readOptionalText(
  filePath: string,
): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export function inspectManagedInstructionBlock(
  existing: string | undefined,
  block: ManagedInstructionBlock,
): ManagedInstructionStatus {
  if (existing === undefined) {
    return "absent";
  }
  const start = existing.indexOf(block.startMarker);
  const end = existing.indexOf(block.endMarker);
  if (start >= 0 !== end >= 0 || (start >= 0 && end < start)) {
    return "malformed";
  }
  if (start < 0) {
    return "absent";
  }
  return existing.includes(block.content) ? "configured" : "outdated";
}

export function mergeManagedInstructionBlock(
  existing: string | undefined,
  block: ManagedInstructionBlock,
): string {
  const status = inspectManagedInstructionBlock(existing, block);
  if (status === "malformed") {
    throw new AutoForgeError(
      "INVALID_STATE",
      `${block.fileName} contains an incomplete AutoForge managed block`,
      { exitCode: EXIT_CODE.invalidState },
    );
  }
  const content = existing?.replace(/\s+$/, "") ?? "";
  const start = content.indexOf(block.startMarker);
  if (start >= 0) {
    const end = content.indexOf(block.endMarker);
    const after = end + block.endMarker.length;
    return `${content.slice(0, start)}${block.content}${content.slice(after)}\n`;
  }
  return `${content ? `${content}\n\n` : ""}${block.content}\n`;
}

export async function atomicWriteText(
  destinationPath: string,
  content: string,
  temporaryId: () => string = randomUUID,
): Promise<void> {
  const temporaryPath = `${destinationPath}.${temporaryId()}.tmp`;
  await mkdir(path.dirname(destinationPath), { recursive: true });
  try {
    const handle = await open(temporaryPath, "wx");
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, destinationPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
