import { readFile } from "node:fs/promises";
import path from "node:path";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import {
  inspectBootstrap,
  scaffoldBootstrapManifest,
} from "../bootstrap/inspect.js";

export async function runBootstrapCommand(options: {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}): Promise<ExitCode> {
  if (
    options.args.length !== 1 ||
    !["inspect", "scaffold", "status"].includes(options.args[0] ?? "")
  ) {
    options.output.stderr("Usage: autoforge bootstrap inspect|scaffold|status");
    return EXIT_CODE.usage;
  }
  try {
    if (options.args[0] === "status") {
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
