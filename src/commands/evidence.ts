import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { ValidationEvidenceStore } from "../quality/evidence.js";

export interface EvidenceCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge evidence list [--json] | evidence summary [--json]",
  );
  return EXIT_CODE.usage;
}

export async function runEvidenceCommand(
  options: EvidenceCommandOptions,
): Promise<ExitCode> {
  const [action, flag] = options.args;
  if (!action || (flag !== undefined && flag !== "--json"))
    return usage(options.output);
  const json = flag === "--json";
  const state = await new ValidationEvidenceStore(
    options.startDirectory,
  ).read();
  if (action === "list") {
    if (json) options.output.stdout(JSON.stringify(state, null, 2));
    else
      options.output.stdout(
        state.evidence.length === 0
          ? "Validation evidence: 0"
          : state.evidence
              .map(
                (evidence) =>
                  `${evidence.id}: ${evidence.status} (${evidence.gateId})`,
              )
              .join("\n"),
      );
    return EXIT_CODE.success;
  }
  if (action === "summary") {
    const summary = {
      total: state.evidence.length,
      passed: state.evidence.filter((evidence) => evidence.status === "passed")
        .length,
      failed: state.evidence.filter((evidence) => evidence.status === "failed")
        .length,
      skipped: state.evidence.filter(
        (evidence) => evidence.status === "skipped",
      ).length,
      requiredFailures: state.evidence.filter(
        (evidence) =>
          evidence.status === "failed" && evidence.severity === "required",
      ).length,
    };
    if (json) options.output.stdout(JSON.stringify(summary, null, 2));
    else
      options.output.stdout(
        `Validation evidence: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped.`,
      );
    return summary.requiredFailures > 0
      ? EXIT_CODE.invalidState
      : EXIT_CODE.success;
  }
  return usage(options.output);
}
