import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import {
  inspectBootstrap,
  scaffoldBootstrapManifest,
} from "../bootstrap/inspect.js";
import { recordBootstrapDiscovery } from "../bootstrap/discovery.js";
import { evaluateBootstrapGates } from "../bootstrap/gates.js";
import { checkVisionConflict } from "../bootstrap/vision-check.js";
import { identifyDiscoveryQuestions } from "../bootstrap/questions.js";
import { recordVisionApproval } from "../bootstrap/approvals.js";
import {
  approveBootstrapArtifact,
  bootstrapArtifactIdSchema,
  readBootstrapManifest,
} from "../bootstrap/manifest.js";
import { reportCommandError } from "../cli/command-error.js";
import { inputSchemaJson } from "../input-schemas/catalog.js";
import {
  amendVisionDocument,
  generateVisionDocument,
} from "../bootstrap/vision.js";

export async function runBootstrapCommand(options: {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}): Promise<ExitCode> {
  if (
    options.args.length === 2 &&
    options.args[1] === "--schema" &&
    ["discover", "discovery-questions"].includes(options.args[0] ?? "")
  ) {
    options.output.stdout(
      JSON.stringify(
        inputSchemaJson(
          options.args[0] === "discover"
            ? "bootstrap-discover"
            : "bootstrap-discovery-questions",
        ),
        null,
        2,
      ),
    );
    return EXIT_CODE.success;
  }
  if (
    options.args.length === 0 ||
    ![
      "inspect",
      "scaffold",
      "status",
      "gates",
      "vision",
      "vision-amend",
      "vision-check",
      "discovery-questions",
      "vision-approve",
      "discover",
      "approve",
    ].includes(options.args[0] ?? "") ||
    ([
      "discover",
      "vision-amend",
      "vision-check",
      "discovery-questions",
      "vision-approve",
    ].includes(options.args[0] ?? "") &&
      options.args.length !== 2) ||
    (options.args[0] === "approve" &&
      !(
        options.args.length === 2 ||
        (options.args.length === 4 && options.args[2] === "--evidence")
      )) ||
    (![
      "discover",
      "vision-amend",
      "vision-check",
      "discovery-questions",
      "vision-approve",
      "approve",
    ].includes(options.args[0] ?? "") &&
      options.args.length !== 1)
  ) {
    options.output.stderr(
      "Usage: autoforge bootstrap inspect|scaffold|status|gates|vision|vision-amend|vision-check <idea>|vision-approve <idea>|discovery-questions <json-file>|discover <json-file>|approve <artifact-id> [--evidence <path|workflow-id>]",
    );
    return EXIT_CODE.usage;
  }
  try {
    if (options.args[0] === "approve") {
      const manifest = await approveBootstrapArtifact(
        options.startDirectory,
        bootstrapArtifactIdSchema.parse(options.args[1]),
        options.args[3] ? { evidence: options.args[3] } : {},
      );
      options.output.stdout(
        JSON.stringify(
          manifest.artifacts.find(
            (artifact) => artifact.id === options.args[1],
          ),
          null,
          2,
        ),
      );
    } else if (options.args[0] === "vision-approve") {
      const approvalPath = await recordVisionApproval(
        options.startDirectory,
        options.args[1]!,
      );
      options.output.stdout(`Recorded vision approval at ${approvalPath}`);
    } else if (options.args[0] === "discovery-questions") {
      options.output.stdout(
        JSON.stringify(
          await identifyDiscoveryQuestions(options.args[1]!),
          null,
          2,
        ),
      );
    } else if (options.args[0] === "vision-check") {
      options.output.stdout(
        JSON.stringify(
          await checkVisionConflict(options.startDirectory, options.args[1]!),
          null,
          2,
        ),
      );
    } else if (options.args[0] === "vision-amend") {
      const visionPath = await amendVisionDocument(
        options.startDirectory,
        options.args[1]!,
      );
      options.output.stdout(`Amended vision document at ${visionPath}`);
    } else if (options.args[0] === "vision") {
      const visionPath = await generateVisionDocument(options.startDirectory);
      options.output.stdout(`Created vision document at ${visionPath}`);
    } else if (options.args[0] === "gates") {
      options.output.stdout(
        JSON.stringify(
          await evaluateBootstrapGates(options.startDirectory),
          null,
          2,
        ),
      );
    } else if (options.args[0] === "discover") {
      const discoveryPath = await recordBootstrapDiscovery(
        options.startDirectory,
        options.args[1]!,
      );
      options.output.stdout(`Recorded bootstrap discovery at ${discoveryPath}`);
    } else if (options.args[0] === "status") {
      options.output.stdout(
        JSON.stringify(
          await readBootstrapManifest(options.startDirectory),
          null,
          2,
        ),
      );
    } else if (options.args[0] === "scaffold") {
      const manifestPath = await scaffoldBootstrapManifest(
        options.startDirectory,
      );
      options.output.stdout(`Created bootstrap manifest at ${manifestPath}`);
    } else {
      const report = await inspectBootstrap(options.startDirectory);
      options.output.stdout(JSON.stringify(report, null, 2));
    }
    return EXIT_CODE.success;
  } catch (error) {
    return reportCommandError(error, options.output);
  }
}
