import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { runQualityGate } from "../quality/service.js";
import type { QualityGateReport } from "../quality/schemas.js";
import { ValidationEvidenceStore } from "../quality/evidence.js";
import { createWorkStateStore } from "../state/kernel.js";

export interface GateCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

interface ParsedGateArguments {
  files: string[];
  json: boolean;
}

function usage(message: string, output: LogWriter): ExitCode {
  output.stderr(message);
  output.stderr(
    "Usage: autoforge gate check [--path <file>] [--files <file,file>] [--json]",
  );
  return EXIT_CODE.usage;
}

function parseGateArguments(
  args: readonly string[],
  output: LogWriter,
): ParsedGateArguments | ExitCode {
  if (args[0] !== "check") {
    return usage('Command "gate" requires the "check" action.', output);
  }
  const files: string[] = [];
  let json = false;
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--path": {
        const value = args[index + 1];
        if (!value) {
          return usage('Option "--path" requires a file.', output);
        }
        files.push(value);
        index += 1;
        break;
      }
      case "--files": {
        const value = args[index + 1];
        if (!value) {
          return usage(
            'Option "--files" requires a comma-separated value.',
            output,
          );
        }
        const parsed = value
          .split(",")
          .map((file) => file.trim())
          .filter(Boolean);
        if (parsed.length === 0) {
          return usage('Option "--files" requires at least one file.', output);
        }
        files.push(...parsed);
        index += 1;
        break;
      }
      case "--json":
        json = true;
        break;
      default:
        return usage(`Unknown gate option: ${argument}`, output);
    }
  }
  return { files, json };
}

function writeTextReport(report: QualityGateReport, output: LogWriter): void {
  for (const check of report.checks) {
    const marker =
      check.status === "pass"
        ? "PASS"
        : check.status === "warning"
          ? "WARN"
          : check.status === "skipped"
            ? "SKIP"
            : "FAIL";
    const writer = check.status === "fail" ? output.stderr : output.stdout;
    writer(`[${marker}] ${check.message}`);
    for (const finding of check.findings) {
      writer(
        `  ${finding.path}:${finding.line} ${finding.ruleId} (value redacted)`,
      );
    }
  }
}

export async function runGateCommand(
  options: GateCommandOptions,
): Promise<ExitCode> {
  const parsed = parseGateArguments(options.args, options.output);
  if (typeof parsed === "number") {
    return parsed;
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const report = await runQualityGate({
    projectRoot: project.path,
    files: parsed.files,
  });
  const evidenceStore = new ValidationEvidenceStore(project.path);
  const capturedAt = new Date().toISOString();
  const workState = (await createWorkStateStore(project.path).read()).state
    .data;
  const activeWorkId = workState.activeWork?.id;
  for (const check of report.checks) {
    await evidenceStore.record({
      id: `evidence.${check.id}.${Date.now()}`,
      gateId: check.id,
      status:
        check.status === "pass"
          ? "passed"
          : check.status === "skipped"
            ? "skipped"
            : "failed",
      severity: check.status === "warning" ? "advisory" : "required",
      ...(activeWorkId ? { workId: activeWorkId } : {}),
      traceIds: [],
      reason: check.message,
      capturedAt,
    });
  }
  if (parsed.json) {
    options.output.stdout(JSON.stringify(report, null, 2));
  } else {
    writeTextReport(report, options.output);
  }
  return report.success ? EXIT_CODE.success : EXIT_CODE.invalidState;
}
