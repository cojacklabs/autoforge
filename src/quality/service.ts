import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { inspectInstallation } from "../commands/init.js";
import type { QualityGateCommand } from "../core/config.js";
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import {
  qualityGateReportSchema,
  type QualityFinding,
  type QualityGateCheck,
  type QualityGateReport,
} from "./schemas.js";

const MAX_SCANNED_FILE_BYTES = 1024 * 1024;

const SECRET_PATTERNS: ReadonlyArray<{
  id: string;
  pattern: RegExp;
}> = [
  {
    id: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { id: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "github-token", pattern: /\bgh[opsu]_[A-Za-z0-9]{36,255}\b/ },
  { id: "openai-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  {
    id: "credential-assignment",
    pattern:
      /["']?(?:api[_-]?key|auth[_-]?token|password|secret|token)["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i,
  },
];

export interface QualityCommandResult {
  exitCode: number | null;
  timedOut: boolean;
}

export type QualityCommandRunner = (
  command: QualityGateCommand,
  projectRoot: string,
) => Promise<QualityCommandResult>;

export interface RunQualityGateOptions {
  projectRoot: string;
  files?: readonly string[];
  commands?: readonly QualityGateCommand[];
  commandRunner?: QualityCommandRunner;
}

interface ScannedFile {
  relativePath: string;
  content?: string;
  problem?: string;
  binary: boolean;
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export function runQualityCommand(
  command: QualityGateCommand,
  projectRoot: string,
): Promise<QualityCommandResult> {
  return new Promise((resolve) => {
    const isolatedProcessGroup = process.platform !== "win32";
    const child = spawn(command.command, command.args, {
      cwd: projectRoot,
      detached: isolatedProcessGroup,
      shell: false,
      stdio: "ignore",
    });
    let settled = false;
    let timedOut = false;
    const finish = (exitCode: number | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode, timedOut });
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      if (isolatedProcessGroup && child.pid !== undefined) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      } else {
        child.kill("SIGKILL");
      }
      finish(null);
    }, command.timeoutMs);
    timeout.unref();

    child.once("error", () => finish(null));
    child.once("close", (exitCode) => finish(exitCode));
  });
}

async function resolveFiles(
  projectRoot: string,
  candidates: readonly string[],
): Promise<Array<{ absolutePath: string; relativePath: string }>> {
  const resolved = await Promise.all(
    candidates.map((candidate) =>
      resolveContainedProjectPath(projectRoot, candidate),
    ),
  );
  const unique = new Map(
    resolved.map((file) => [
      file.relativePath,
      { absolutePath: file.absolutePath, relativePath: file.relativePath },
    ]),
  );
  return [...unique.values()].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

async function scanFile(file: {
  absolutePath: string;
  relativePath: string;
}): Promise<ScannedFile> {
  try {
    const fileStat = await stat(file.absolutePath);
    if (!fileStat.isFile()) {
      return {
        relativePath: file.relativePath,
        problem: "Path is not a regular file.",
        binary: false,
      };
    }
    if (fileStat.size > MAX_SCANNED_FILE_BYTES) {
      return {
        relativePath: file.relativePath,
        problem: `File exceeds the ${MAX_SCANNED_FILE_BYTES}-byte scan limit.`,
        binary: false,
      };
    }
    const buffer = await readFile(file.absolutePath);
    if (buffer.includes(0)) {
      return { relativePath: file.relativePath, binary: true };
    }
    return {
      relativePath: file.relativePath,
      content: buffer.toString("utf8"),
      binary: false,
    };
  } catch (error) {
    const message = isNodeError(error, "ENOENT")
      ? "File does not exist."
      : "File could not be read.";
    return { relativePath: file.relativePath, problem: message, binary: false };
  }
}

function fileAccessCheck(files: readonly ScannedFile[]): QualityGateCheck {
  const failures = files.filter((file) => file.problem !== undefined);
  if (failures.length > 0) {
    return {
      id: "file-access",
      status: "fail",
      message: `${failures.length} selected file(s) could not be safely inspected: ${failures.map((file) => file.relativePath).join(", ")}.`,
      findings: [],
    };
  }
  return {
    id: "file-access",
    status: "pass",
    message: `${files.length} selected file(s) are readable regular files within the project.`,
    findings: [],
  };
}

function secretCheck(files: readonly ScannedFile[]): QualityGateCheck {
  const findings: QualityFinding[] = [];
  for (const file of files) {
    if (file.content === undefined) {
      continue;
    }
    for (const [lineIndex, line] of file.content.split(/\r?\n/).entries()) {
      for (const secretPattern of SECRET_PATTERNS) {
        if (secretPattern.pattern.test(line)) {
          findings.push({
            ruleId: secretPattern.id,
            path: file.relativePath,
            line: lineIndex + 1,
          });
        }
      }
    }
  }
  return findings.length === 0
    ? {
        id: "secret-scan",
        status: "pass",
        message:
          "No recognized secret patterns were found in selected text files.",
        findings: [],
      }
    : {
        id: "secret-scan",
        status: "fail",
        message: `${findings.length} potential secret finding(s) require review; matched values are redacted.`,
        findings,
      };
}

function syntaxCheck(files: readonly ScannedFile[]): QualityGateCheck {
  const targets = files.filter(
    (file) =>
      file.content !== undefined &&
      /\.(?:json|ya?ml)$/i.test(file.relativePath),
  );
  if (targets.length === 0) {
    return {
      id: "structured-syntax",
      status: "skipped",
      message: "No selected JSON or YAML files require syntax validation.",
      findings: [],
    };
  }
  const invalid: string[] = [];
  for (const file of targets) {
    try {
      if (/\.json$/i.test(file.relativePath)) {
        JSON.parse(file.content ?? "");
      } else {
        parseYaml(file.content ?? "");
      }
    } catch {
      invalid.push(file.relativePath);
    }
  }
  return invalid.length === 0
    ? {
        id: "structured-syntax",
        status: "pass",
        message: `${targets.length} selected JSON/YAML file(s) parsed successfully.`,
        findings: [],
      }
    : {
        id: "structured-syntax",
        status: "fail",
        message: `Invalid structured syntax in: ${invalid.join(", ")}.`,
        findings: [],
      };
}

async function commandChecks(
  commands: readonly QualityGateCommand[],
  projectRoot: string,
  runner: QualityCommandRunner,
): Promise<QualityGateCheck[]> {
  if (commands.length === 0) {
    return [
      {
        id: "configured-commands",
        status: "skipped",
        message: "No project quality commands are configured.",
        findings: [],
      },
    ];
  }
  const checks: QualityGateCheck[] = [];
  for (const command of commands) {
    const result = await runner(command, projectRoot);
    checks.push({
      id: `command.${command.id}`,
      status: result.exitCode === 0 && !result.timedOut ? "pass" : "fail",
      message: result.timedOut
        ? `Quality command ${command.id} timed out after ${command.timeoutMs}ms.`
        : result.exitCode === null
          ? `Quality command ${command.id} could not be executed.`
          : `Quality command ${command.id} exited with code ${result.exitCode}.`,
      findings: [],
    });
  }
  return checks;
}

export async function runQualityGate(
  options: RunQualityGateOptions,
): Promise<QualityGateReport> {
  const projectRoot = path.resolve(options.projectRoot);
  const inspection = await inspectInstallation(projectRoot);
  const checks: QualityGateCheck[] = [
    inspection.status === "current"
      ? {
          id: "installation",
          status: "pass",
          message:
            "AutoForge installation state is current and internally consistent.",
          findings: [],
        }
      : {
          id: "installation",
          status: "fail",
          message: `AutoForge installation is ${inspection.status}; quality commands were not executed.`,
          findings: [],
        },
  ];
  const resolvedFiles = await resolveFiles(projectRoot, options.files ?? []);
  const files = await Promise.all(resolvedFiles.map(scanFile));

  if (files.length === 0) {
    checks.push(
      {
        id: "file-access",
        status: "skipped",
        message: "No files were selected for contained-file validation.",
        findings: [],
      },
      {
        id: "secret-scan",
        status: "skipped",
        message: "No files were selected for secret scanning.",
        findings: [],
      },
      syntaxCheck(files),
    );
  } else {
    const access = fileAccessCheck(files);
    checks.push(access);
    if (access.status === "pass") {
      const binaryCount = files.filter((file) => file.binary).length;
      if (binaryCount > 0) {
        checks.push({
          id: "binary-files",
          status: "warning",
          message: `${binaryCount} selected binary file(s) were excluded from content checks.`,
          findings: [],
        });
      }
      checks.push(secretCheck(files), syntaxCheck(files));
    } else {
      checks.push(
        {
          id: "secret-scan",
          status: "skipped",
          message:
            "Secret scanning was skipped because selected files were unreadable.",
          findings: [],
        },
        {
          id: "structured-syntax",
          status: "skipped",
          message:
            "Syntax validation was skipped because selected files were unreadable.",
          findings: [],
        },
      );
    }
  }

  if (inspection.status === "current") {
    checks.push(
      ...(await commandChecks(
        options.commands ?? inspection.config?.qualityGates ?? [],
        projectRoot,
        options.commandRunner ?? runQualityCommand,
      )),
    );
  } else {
    checks.push({
      id: "configured-commands",
      status: "skipped",
      message:
        "Project quality commands require a current AutoForge installation.",
      findings: [],
    });
  }

  return qualityGateReportSchema.parse({
    success: checks.every((check) => check.status !== "fail"),
    projectRoot,
    files: files.map((file) => file.relativePath),
    checks,
  });
}
