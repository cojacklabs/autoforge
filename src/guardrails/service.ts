import { readFile } from "node:fs/promises";

import { CANONICAL_AGENT_CONTEXT_PATH } from "../agents/context.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import type { ContextPacket } from "../context/packet.js";
import type { DoctrineSessionState } from "../doctrine/session.js";
import type { DoctrineRegistry } from "../doctrine/schemas.js";
import type { SessionState, WorkState } from "../work/schemas.js";
import { evaluateGuardrails, type ContextFreshness } from "./policy.js";
import type { GuardrailEnforcement, GuardrailReport } from "./schemas.js";

export interface GuardrailServiceInput {
  work: WorkState;
  sessions: SessionState;
  doctrineSessions: DoctrineSessionState;
  doctrines: DoctrineRegistry;
  expectedPacket?: ContextPacket;
  enforcement: GuardrailEnforcement;
  agentId?: string;
  targetPath?: string;
}

async function readOptional(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export class GuardrailService {
  constructor(private readonly projectRoot: string) {}

  async evaluate(input: GuardrailServiceInput): Promise<GuardrailReport> {
    const targetPath = input.targetPath
      ? (await resolveContainedProjectPath(this.projectRoot, input.targetPath))
          .relativePath
      : undefined;
    const contextFreshness = await this.contextFreshness(input.expectedPacket);
    return evaluateGuardrails({
      work: input.work,
      sessions: input.sessions,
      doctrineSessions: input.doctrineSessions,
      doctrines: input.doctrines,
      contextFreshness,
      enforcement: input.enforcement,
      ...(input.agentId ? { agentId: input.agentId } : {}),
      ...(targetPath ? { targetPath } : {}),
    });
  }

  private async contextFreshness(
    expectedPacket: ContextPacket | undefined,
  ): Promise<ContextFreshness> {
    if (!expectedPacket) {
      return "missing";
    }
    const [current, history] = await Promise.all([
      resolveContainedProjectPath(
        this.projectRoot,
        CANONICAL_AGENT_CONTEXT_PATH,
      ),
      resolveContainedProjectPath(
        this.projectRoot,
        `.autoforge/context/packets/${expectedPacket.workId}.md`,
      ),
    ]);
    const [currentContent, historyContent] = await Promise.all([
      readOptional(current.absolutePath),
      readOptional(history.absolutePath),
    ]);
    if (currentContent === undefined || historyContent === undefined) {
      return "missing";
    }
    const expectedContent = `${expectedPacket.content.replace(/\n*$/, "")}\n`;
    return currentContent === expectedContent &&
      historyContent === expectedContent
      ? "current"
      : "stale";
  }
}
