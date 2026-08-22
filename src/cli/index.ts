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
import { runContractCommand } from "../commands/contract.js";
import { runProjectsCommand } from "../commands/projects.js";
import { runAttachCommand } from "../commands/attach.js";
import { runDetachCommand } from "../commands/detach.js";
import { runAgentsCommand } from "../commands/agents.js";
import { runAssetsCommand } from "../commands/assets.js";
import { runBootstrapCommand } from "../commands/bootstrap.js";
import { runConstitutionCommand } from "../commands/constitution.js";
import { runDomainCommand } from "../commands/domain.js";
import { runUpdateCommand } from "../commands/update.js";
import { runTraceabilityCommand } from "../commands/traceability.js";
import { runEvidenceCommand } from "../commands/evidence.js";
import { runMigrateCommand } from "../commands/migrate.js";
import { runRecapCommand } from "../commands/recap.js";
import { runStartCommand } from "../commands/start.js";
import { runTuiCommand } from "../commands/tui.js";
import { runWhyCommand } from "../commands/why.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";
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
    let normalizedArgs = [...args];
    if (normalizedArgs[0] === "use") {
      const alias = normalizedArgs[1];
      if (!alias) return EXIT_CODE.usage;
      const config = await new GlobalWorkspaceStore().read();
      const matchingProjects = config.projects.filter(
        (project) => config.projectMetadata?.[project]?.name === alias,
      );
      if (matchingProjects.length !== 1) return EXIT_CODE.usage;
      const projectDirectory = matchingProjects[0]!;
      normalizedArgs = [
        "--project",
        projectDirectory,
        ...normalizedArgs.slice(2),
      ];
    }
    const projectIndex = normalizedArgs.indexOf("--project");
    const projectDirectory =
      projectIndex >= 0 ? normalizedArgs[projectIndex + 1] : undefined;
    if (projectIndex >= 0 && !projectDirectory) {
      output.stderr('Option "--project" requires a path.');
      return EXIT_CODE.usage;
    }
    const cliArgs =
      projectIndex >= 0
        ? normalizedArgs.filter(
            (_, index) => index !== projectIndex && index !== projectIndex + 1,
          )
        : normalizedArgs;
    const startDirectory = projectDirectory
      ? path.resolve(projectDirectory)
      : process.cwd();
    return await runCli(cliArgs, {
      output,
      version: findPackageVersion(),
      commands: {
        add: (commandArgs) =>
          runAddCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        check: (commandArgs) =>
          runCheckCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        context: (commandArgs) =>
          runContextCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        decide: (commandArgs) =>
          runDecideCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        design: (commandArgs) =>
          runDesignCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        doctrine: (commandArgs) =>
          runDoctrineCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        doctor: (commandArgs) =>
          runDoctorCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        done: (commandArgs) =>
          runDoneCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        gate: (commandArgs) =>
          runGateCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        init: (commandArgs) =>
          runInitCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        intent: (commandArgs) =>
          runIntentCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        research: (commandArgs) =>
          runResearchCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        knowledge: (commandArgs) =>
          runKnowledgeCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        planning: (commandArgs) =>
          runPlanningCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        workflow: (commandArgs) =>
          runWorkflowCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        contract: (commandArgs) =>
          runContractCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        projects: (commandArgs) =>
          runProjectsCommand({ args: commandArgs, output }),
        attach: (commandArgs) =>
          runAttachCommand({ args: commandArgs, output }),
        detach: (commandArgs) =>
          runDetachCommand({ args: commandArgs, output }),
        agents: (commandArgs) =>
          runAgentsCommand({ args: commandArgs, output }),
        assets: (commandArgs) =>
          runAssetsCommand({ args: commandArgs, output }),
        bootstrap: (commandArgs) =>
          runBootstrapCommand({ args: commandArgs, output, startDirectory }),
        constitution: (commandArgs) =>
          runConstitutionCommand({ args: commandArgs, output, startDirectory }),
        domain: (commandArgs) =>
          runDomainCommand({ args: commandArgs, output, startDirectory }),
        update: (commandArgs) =>
          runUpdateCommand({
            args: commandArgs,
            output,
            globalInstall: !path
              .resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
              .startsWith(path.resolve(startDirectory)),
          }),
        trace: (commandArgs) =>
          runTraceabilityCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        evidence: (commandArgs) =>
          runEvidenceCommand({ args: commandArgs, output, startDirectory }),
        migrate: (commandArgs) =>
          runMigrateCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        recap: (commandArgs) =>
          runRecapCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        start: (commandArgs) =>
          runStartCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        tui: (commandArgs) =>
          runTuiCommand({
            args: commandArgs,
            output,
            startDirectory,
          }),
        why: (commandArgs) =>
          runWhyCommand({
            args: commandArgs,
            output,
            startDirectory,
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
