import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

import { AutoForgeError, EXIT_CODE, toAutoForgeError } from "../core/errors.js";
import { runAddCommand } from "../commands/add.js";
import { runCheckCommand } from "../commands/check.js";
import { runContextCommand } from "../commands/context.js";
import { runDecideCommand } from "../commands/decide.js";
import { runDesignCommand } from "../commands/design.js";
import { runDoctrineCommand } from "../commands/doctrine.js";
import { runDoctorCommand } from "../commands/doctor.js";
import { runDoneCommand } from "../commands/done.js";
import { runGateCommand } from "../commands/gate.js";
import { runInitCommand } from "../commands/init.js";
import { runIntentCommand } from "../commands/intent.js";
import { runResearchCommand } from "../commands/research.js";
import { runKnowledgeCommand } from "../commands/knowledge.js";
import { runPlanningCommand } from "../commands/planning.js";
import { runWorkflowCommand } from "../commands/workflow.js";
import { runMigrateCommand } from "../commands/migrate.js";
import { runRecapCommand } from "../commands/recap.js";
import { runStartCommand } from "../commands/start.js";
import { runTuiCommand } from "../commands/tui.js";
import { runWhyCommand } from "../commands/why.js";
import { runCli, type CliOutput } from "./router.js";

interface PackageMetadata {
  name?: unknown;
  version?: unknown;
}

export function findPackageVersion(startUrl: string = import.meta.url): string {
  let currentDirectory = path.dirname(fileURLToPath(startUrl));

  while (true) {
    const packagePath = path.join(currentDirectory, "package.json");
    if (existsSync(packagePath)) {
      const metadata = JSON.parse(
        readFileSync(packagePath, "utf8"),
      ) as PackageMetadata;
      if (
        metadata.name === "@cojacklabs/autoforge" &&
        typeof metadata.version === "string"
      ) {
        return metadata.version;
      }
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }
    currentDirectory = parentDirectory;
  }

  throw new AutoForgeError(
    "FILESYSTEM_ERROR",
    "Unable to locate AutoForge package metadata",
    { exitCode: EXIT_CODE.filesystem },
  );
}

const consoleOutput: CliOutput = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
};

export async function main(
  args: readonly string[] = process.argv.slice(2),
  output: CliOutput = consoleOutput,
): Promise<number> {
  try {
    return await runCli(args, {
      output,
      version: findPackageVersion(),
      commands: {
        add: (commandArgs) =>
          runAddCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        check: (commandArgs) =>
          runCheckCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        context: (commandArgs) =>
          runContextCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        decide: (commandArgs) =>
          runDecideCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        design: (commandArgs) =>
          runDesignCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        doctrine: (commandArgs) =>
          runDoctrineCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        doctor: (commandArgs) =>
          runDoctorCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        done: (commandArgs) =>
          runDoneCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        gate: (commandArgs) =>
          runGateCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        init: (commandArgs) =>
          runInitCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        intent: (commandArgs) =>
          runIntentCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        research: (commandArgs) =>
          runResearchCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        knowledge: (commandArgs) =>
          runKnowledgeCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        planning: (commandArgs) =>
          runPlanningCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        workflow: (commandArgs) =>
          runWorkflowCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        migrate: (commandArgs) =>
          runMigrateCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        recap: (commandArgs) =>
          runRecapCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        start: (commandArgs) =>
          runStartCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        tui: (commandArgs) =>
          runTuiCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
        why: (commandArgs) =>
          runWhyCommand({
            args: commandArgs,
            output,
            startDirectory: process.cwd(),
          }),
      },
    });
  } catch (error) {
    const autoforgeError = toAutoForgeError(error);
    output.stderr(`Error: ${autoforgeError.message}`);
    return autoforgeError.exitCode;
  }
}

const entryPath = process.argv[1];
if (
  entryPath &&
  import.meta.url === pathToFileURL(realpathSync(entryPath)).href
) {
  process.exitCode = await main();
}
