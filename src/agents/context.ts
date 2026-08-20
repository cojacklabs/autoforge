import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import {
  agentContextPayloadSchema,
  type AgentAdapterContext,
  type AgentContextPayload,
} from "./adapter.js";

export const CANONICAL_AGENT_CONTEXT_PATH = ".autoforge/context/current.md";

export interface CanonicalContextWriterOptions {
  temporaryId?: () => string;
}

export async function assertInitializedAgentProject(
  context: AgentAdapterContext,
): Promise<void> {
  try {
    const configPath = await resolveContainedProjectPath(
      context.projectRoot,
      ".autoforge/config.json",
    );
    await lstat(configPath.absolutePath);
  } catch (error) {
    throw new AutoForgeError(
      "INVALID_STATE",
      "Context delivery requires an initialized AutoForge project",
      { cause: error, exitCode: EXIT_CODE.invalidState },
    );
  }
}

export async function writeCanonicalAgentContext(
  context: AgentAdapterContext,
  payload: AgentContextPayload,
  options: CanonicalContextWriterOptions = {},
): Promise<string> {
  await assertInitializedAgentProject(context);
  const validatedPayload = agentContextPayloadSchema.parse(payload);
  const destinationPath = (
    await resolveContainedProjectPath(
      context.projectRoot,
      CANONICAL_AGENT_CONTEXT_PATH,
    )
  ).absolutePath;
  const temporaryId = options.temporaryId ?? randomUUID;
  const temporaryPath = `${destinationPath}.${temporaryId()}.tmp`;
  const content = `${validatedPayload.content.replace(/\n*$/, "")}\n`;

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
  return CANONICAL_AGENT_CONTEXT_PATH;
}
