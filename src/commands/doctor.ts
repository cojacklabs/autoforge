import { constants } from "node:fs";
import { access } from "node:fs/promises";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { inspectInstallation } from "./init.js";
import { AgentContractStore } from "../contract/generator.js";

export type DoctorCheckStatus = "pass" | "warning" | "fail";

export interface DoctorCheck {
  id: string;
  status: DoctorCheckStatus;
  message: string;
}

export interface DoctorReport {
  healthy: boolean;
  checks: DoctorCheck[];
  projectRoot?: string;
}

export interface DoctorOptions {
  startDirectory: string;
  nodeVersion?: string;
  checkAccess?: (candidatePath: string, mode: number) => Promise<void>;
}

export interface DoctorCommandOptions extends DoctorOptions {
  args: readonly string[];
  output: LogWriter;
}

const MINIMUM_NODE_MAJOR = 20;

function nodeMajor(version: string): number | undefined {
  const match = /^v?(\d+)(?:\.|$)/.exec(version);
  if (!match?.[1]) {
    return undefined;
  }

  const major = Number(match[1]);
  return Number.isInteger(major) ? major : undefined;
}

function report(checks: DoctorCheck[], projectRoot?: string): DoctorReport {
  return {
    healthy: checks.every((check) => check.status !== "fail"),
    checks,
    ...(projectRoot ? { projectRoot } : {}),
  };
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const version = options.nodeVersion ?? process.versions.node;
  const major = nodeMajor(version);

  if (major !== undefined && major >= MINIMUM_NODE_MAJOR) {
    checks.push({
      id: "node-version",
      status: "pass",
      message: `Node.js ${version} is supported.`,
    });
  } else {
    checks.push({
      id: "node-version",
      status: "fail",
      message: `Node.js ${version} is unsupported; AutoForge requires Node.js ${MINIMUM_NODE_MAJOR} or newer.`,
    });
  }

  let projectRoot: string;
  try {
    const project = await discoverProjectRoot({
      startDirectory: options.startDirectory,
    });
    projectRoot = project.path;
    checks.push({
      id: "project-root",
      status: "pass",
      message: `Project root found at ${projectRoot}.`,
    });
  } catch (error) {
    checks.push({
      id: "project-root",
      status: "fail",
      message:
        error instanceof Error
          ? error.message
          : "Unable to discover the project root.",
    });
    return report(checks);
  }

  try {
    const contract = await new AgentContractStore(projectRoot).read();
    checks.push({
      id: "agent-contract",
      status: "pass",
      message: `Agent contract for ${contract.agentId} is valid.`,
    });
  } catch {
    checks.push({
      id: "agent-contract",
      status: "warning",
      message:
        "No valid agent contract found; generate one before agent execution.",
    });
  }

  const checkAccess = options.checkAccess ?? access;
  try {
    await checkAccess(projectRoot, constants.R_OK | constants.W_OK);
    checks.push({
      id: "filesystem-access",
      status: "pass",
      message: "Project filesystem is readable and writable.",
    });
  } catch {
    checks.push({
      id: "filesystem-access",
      status: "fail",
      message: `Project root is not readable and writable: ${projectRoot}`,
    });
  }

  try {
    const installation = await inspectInstallation(projectRoot);
    switch (installation.status) {
      case "absent":
        checks.push({
          id: "installation",
          status: "fail",
          message: 'AutoForge is not initialized. Run "autoforge init".',
        });
        break;
      case "legacy":
        checks.push({
          id: "installation",
          status: "fail",
          message:
            'A legacy AutoForge installation was detected. Run "autoforge migrate --dry-run" to inspect migration.',
        });
        break;
      case "partial":
        checks.push({
          id: "installation",
          status: "fail",
          message:
            "The AutoForge installation is partial or has mismatched project identity.",
        });
        break;
      case "current":
        checks.push({
          id: "installation",
          status: "pass",
          message: "AutoForge installation is current.",
        });
        checks.push({
          id: "config-schema",
          status: "pass",
          message: `Config schema is valid at version ${installation.config?.schemaVersion}.`,
        });
        checks.push({
          id: "metadata-schema",
          status: "pass",
          message: `Metadata schema is valid at version ${installation.metadata?.schemaVersion}.`,
        });
        checks.push({
          id: "work-schema",
          status: "pass",
          message: `Work schema is valid at version ${installation.work?.schemaVersion}.`,
        });
        checks.push({
          id: "session-schema",
          status: "pass",
          message: `Session schema is valid at version ${installation.session?.schemaVersion}.`,
        });
        checks.push({
          id: "decision-schema",
          status: "pass",
          message: `Decision schema is valid at version ${installation.decisions?.schemaVersion}.`,
        });
        checks.push({
          id: "doctrine-schema",
          status: "pass",
          message: `Doctrine schema is valid at version ${installation.doctrines?.schemaVersion}.`,
        });
        checks.push({
          id: "doctrine-session-schema",
          status: "pass",
          message: `Doctrine session schema is valid at version ${installation.doctrineSession?.schemaVersion}.`,
        });
        checks.push({
          id: "project-identity",
          status: "pass",
          message: "Config and metadata project identities match.",
        });
        break;
    }
  } catch (error) {
    checks.push({
      id: "installation-schema",
      status: "fail",
      message:
        error instanceof Error
          ? error.message
          : "Unable to validate the AutoForge installation.",
    });
  }

  return report(checks, projectRoot);
}

export async function runDoctorCommand(
  options: DoctorCommandOptions,
): Promise<ExitCode> {
  if (options.args.length > 0) {
    options.output.stderr('Command "doctor" does not accept arguments.');
    return EXIT_CODE.usage;
  }

  const doctorReport = await runDoctor(options);
  for (const check of doctorReport.checks) {
    const marker =
      check.status === "pass"
        ? "PASS"
        : check.status === "warning"
          ? "WARN"
          : "FAIL";
    const message = `[${marker}] ${check.message}`;
    if (check.status === "fail") {
      options.output.stderr(message);
    } else {
      options.output.stdout(message);
    }
  }

  return doctorReport.healthy ? EXIT_CODE.success : EXIT_CODE.invalidState;
}
