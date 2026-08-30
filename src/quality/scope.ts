import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import type { QualityGateCommand } from "../core/config.js";

const execFileAsync = promisify(execFile);

export async function computeCurrentRevision(
  projectRoot: string,
): Promise<{ sha: string; dirty: boolean } | undefined> {
  try {
    const { stdout: sha } = await execFileAsync("git", [
      "-C",
      projectRoot,
      "rev-parse",
      "HEAD",
    ]);
    const { stdout: status } = await execFileAsync("git", [
      "-C",
      projectRoot,
      "status",
      "--porcelain",
    ]);
    return { sha: sha.trim(), dirty: status.trim().length > 0 };
  } catch {
    return undefined;
  }
}

export function computeCurrentEnvironment(): {
  platform: string;
  nodeMajor: number;
  ci: boolean;
} {
  const nodeMajor = Number(process.version.replace(/^v/, "").split(".")[0]);
  return {
    platform: process.platform,
    nodeMajor,
    ci: Boolean(process.env.CI),
  };
}

export interface GateDefinitionFingerprintOptions {
  qualityGates: readonly QualityGateCommand[];
  entrypointUrl?: string;
}

export async function computeGateDefinitionFingerprint(
  checkId: string,
  options: GateDefinitionFingerprintOptions,
): Promise<string> {
  if (checkId.startsWith("command.")) {
    const commandId = checkId.slice("command.".length);
    const entry = options.qualityGates.find((gate) => gate.id === commandId);
    const payload = entry
      ? JSON.stringify({
          command: entry.command,
          args: entry.args,
          timeoutMs: entry.timeoutMs,
        })
      : `missing:${commandId}`;
    return createHash("sha256").update(payload).digest("hex");
  }
  const entrypointUrl = options.entrypointUrl ?? import.meta.url;
  const entrypointPath = fileURLToPath(entrypointUrl);
  const contents = await readFile(entrypointPath);
  return createHash("sha256").update(contents).digest("hex");
}
