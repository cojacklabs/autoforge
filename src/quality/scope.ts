import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import type { QualityGateCommand } from "../core/config.js";

const execFileAsync = promisify(execFile);

export async function computeCurrentRevision(
  projectRoot: string,
): Promise<
  { sha: string; dirty: boolean; worktreeFingerprint?: string } | undefined
> {
  try {
    const [{ stdout: sha }, { stdout: diff }, { stdout: untrackedOutput }] =
      await Promise.all([
        execFileAsync("git", ["-C", projectRoot, "rev-parse", "HEAD"]),
        execFileAsync(
          "git",
          [
            "-C",
            projectRoot,
            "diff",
            "--binary",
            "HEAD",
            "--",
            ".",
            ":(exclude).autoforge/quality/evidence.json",
          ],
          { maxBuffer: 64 * 1024 * 1024 },
        ),
        execFileAsync("git", [
          "-C",
          projectRoot,
          "ls-files",
          "--others",
          "--exclude-standard",
          "-z",
          "--",
          ".",
          ":(exclude).autoforge/quality/evidence.json",
        ]),
      ]);
    const untracked = untrackedOutput.split("\0").filter(Boolean).sort();
    const dirty = diff.length > 0 || untracked.length > 0;
    if (!dirty) return { sha: sha.trim(), dirty: false };

    const fingerprint = createHash("sha256").update(diff);
    for (const relativePath of untracked) {
      const { stdout: objectHash } = await execFileAsync("git", [
        "-C",
        projectRoot,
        "hash-object",
        "--no-filters",
        "--",
        relativePath,
      ]);
      fingerprint.update("\0").update(relativePath).update("\0");
      fingerprint.update(objectHash.trim());
    }
    return {
      sha: sha.trim(),
      dirty: true,
      worktreeFingerprint: fingerprint.digest("hex"),
    };
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

export const BUILT_IN_REQUIRED_GATE_IDS = [
  "installation",
  "file-access",
  "secret-scan",
  "structured-syntax",
] as const;

export function expectedRequiredGateIds(
  qualityGates: readonly QualityGateCommand[],
): string[] {
  return [
    ...BUILT_IN_REQUIRED_GATE_IDS,
    ...qualityGates.map((gate) => `command.${gate.id}`),
  ].sort();
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

export async function computeGateDefinitionFingerprints(
  gateIds: readonly string[],
  options: GateDefinitionFingerprintOptions,
): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      gateIds.map(async (gateId) => [
        gateId,
        await computeGateDefinitionFingerprint(gateId, options),
      ]),
    ),
  );
}
