import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { inspectInstallation } from "./init.js";
import { ValidationEvidenceStore } from "../quality/evidence.js";
import { evaluateReadiness } from "../quality/readiness.js";
import {
  computeCurrentEnvironment,
  computeCurrentRevision,
  computeGateDefinitionFingerprints,
  expectedRequiredGateIds,
} from "../quality/scope.js";

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
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const state = await new ValidationEvidenceStore(project.path).read();
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
    const inspection = await inspectInstallation(project.path);
    const qualityGates = inspection.config?.qualityGates ?? [];
    const expectedGateIds = expectedRequiredGateIds(qualityGates);
    const revision = await computeCurrentRevision(project.path);
    const environment = computeCurrentEnvironment();
    const gateDefinitionFingerprints = await computeGateDefinitionFingerprints(
      expectedGateIds,
      {
        qualityGates,
      },
    );
    const readiness = evaluateReadiness(state.evidence, {
      currentScope: {
        ...(revision !== undefined ? { revision } : {}),
        environment,
        gateDefinitionFingerprints,
      },
      expectedGateIds,
    });
    const summary = {
      ...readiness,
      requiredFailures: readiness.blockers.length,
    };
    if (json) options.output.stdout(JSON.stringify(summary, null, 2));
    else {
      const outOfScopeClause =
        summary.outOfScopeCount > 0
          ? `; ${summary.outOfScopeCount} excluded as out of scope`
          : "";
      options.output.stdout(
        `Validation evidence: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped historically; ${summary.effectiveTotal} authoritative required result(s), ${summary.requiredFailures} blocker(s)${outOfScopeClause}.`,
      );
    }
    return readiness.ready ? EXIT_CODE.success : EXIT_CODE.invalidState;
  }
  return usage(options.output);
}
