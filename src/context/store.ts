import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

import {
  CANONICAL_AGENT_CONTEXT_PATH,
  assertInitializedAgentProject,
  writeCanonicalAgentContext,
} from "../agents/context.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { contextPacketSchema, type ContextPacket } from "./packet.js";

export const DEFAULT_CONTEXT_PACKET_DIRECTORY = ".autoforge/context/packets";

export interface ContextPacketStoreOptions {
  packetDirectory?: string;
  temporaryId?: () => string;
}

export interface ContextPacketWriteResult {
  currentPath: string;
  packetPath: string;
}

export class ContextPacketStore {
  private readonly packetDirectory: string;
  private readonly temporaryId: () => string;

  constructor(
    private readonly projectRoot: string,
    options: ContextPacketStoreOptions = {},
  ) {
    this.packetDirectory =
      options.packetDirectory ?? DEFAULT_CONTEXT_PACKET_DIRECTORY;
    this.temporaryId = options.temporaryId ?? randomUUID;
  }

  async write(value: ContextPacket): Promise<ContextPacketWriteResult> {
    const packet = contextPacketSchema.parse(value);
    const context = { projectRoot: this.projectRoot };
    await assertInitializedAgentProject(context);
    const packetPath = `${this.packetDirectory}/${packet.workId}.md`;
    const destination = await resolveContainedProjectPath(
      this.projectRoot,
      packetPath,
    );
    const temporaryPath = `${destination.absolutePath}.${this.temporaryId()}.tmp`;
    const content = `${packet.content.replace(/\n*$/, "")}\n`;

    await mkdir(path.dirname(destination.absolutePath), { recursive: true });
    try {
      const handle = await open(temporaryPath, "wx");
      try {
        await handle.writeFile(content, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, destination.absolutePath);
    } finally {
      await rm(temporaryPath, { force: true });
    }

    await writeCanonicalAgentContext(
      context,
      {
        id: packet.id,
        content: packet.content,
        format: packet.format,
        estimatedTokens: packet.estimatedTokens,
      },
      { temporaryId: this.temporaryId },
    );
    return {
      currentPath: CANONICAL_AGENT_CONTEXT_PATH,
      packetPath: destination.relativePath,
    };
  }
}
