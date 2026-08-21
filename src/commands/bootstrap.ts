import { readFile } from "node:fs/promises";
import path from "node:path";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import {
  inspectBootstrap,
  scaffoldBootstrapManifest,
} from "../bootstrap/inspect.js";
import { recordBootstrapDiscovery } from "../bootstrap/discovery.js";
import { evaluateBootstrapGates } from "../bootstrap/gates.js";
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
    options.args.length === 0 ||
    ![
      "inspect",
      "scaffold",
      "status",
      "gates",
      "vision",
      "vision-amend",
      "discover",
    ].includes(options.args[0] ?? "") ||
    (["discover", "vision-amend"].includes(options.args[0] ?? "") &&
      options.args.length !== 2) ||
    (!["discover", "vision-amend"].includes(options.args[0] ?? "") &&
      options.args.length !== 1)
  ) {
    options.output.stderr(
      "Usage: autoforge bootstrap inspect|scaffold|status|gates|vision|vision-amend|discover <json-file>",
    );
    return EXIT_CODE.usage;
  }
  try {
    if (options.args[0] === "vision-amend") {
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
      const manifestPath = path.join(
        options.startDirectory,
        ".autoforge",
        "bootstrap",
        "manifest.json",
      );
      options.output.stdout(await readFile(manifestPath, "utf8"));
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
  } catch {
    options.output.stderr("Unable to inspect project bootstrap readiness.");
    return EXIT_CODE.notFound;
  }
}
