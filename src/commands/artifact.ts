import { readFile } from "node:fs/promises";
import { ProjectArtifactService } from "@cojacklabs/priozar-core";
import { projectArtifactIdSchema } from "@cojacklabs/priozar-protocol";
import { reportCommandError } from "../cli/command-error.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { discoverProjectRoot } from "../core/project.js";
import { FileProjectArtifactRepository } from "../artifacts/store.js";
import { computeCurrentRevision } from "../quality/scope.js";

export interface ArtifactCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  computeRevision?: typeof computeCurrentRevision;
}
function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: priozar artifact register <json-file> | import <file> --id <artifact-id> --kind <kind> --title <title> --agent <agent-id> --work <work-id> | list | show <id> | approve <id> --by <actor> | supersede <id> <json-file>",
  );
  return EXIT_CODE.usage;
}

function importOptions(
  args: readonly string[],
): Record<string, string> | undefined {
  if (args.length % 2 !== 0) return undefined;
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith("--") || !value || values[flag]) return undefined;
    values[flag] = value;
  }
  return values;
}
async function input(projectRoot: string, candidate: string) {
  const resolved = await resolveContainedProjectPath(projectRoot, candidate);
  const value = JSON.parse(
    await readFile(resolved.absolutePath, "utf8"),
  ) as Record<string, unknown>;
  const {
    schemaVersion: _schemaVersion,
    status: _status,
    approval: _approval,
    createdAt: _createdAt,
    supersedes: _supersedes,
    ...create
  } = value;
  return create as Parameters<ProjectArtifactService["create"]>[0];
}
export async function runArtifactCommand(
  options: ArtifactCommandOptions,
): Promise<ExitCode> {
  try {
    const [action, subject, ...rest] = options.args;
    const project = await discoverProjectRoot({
      startDirectory: options.startDirectory,
    });
    const repository = new FileProjectArtifactRepository(project.path);
    const service = new ProjectArtifactService(repository);
    if (action === "import" && subject) {
      const values = importOptions(rest);
      if (
        !values ||
        !values["--id"] ||
        !values["--kind"] ||
        !values["--title"] ||
        !values["--agent"] ||
        !values["--work"]
      )
        return usage(options.output);
      const resolved = await resolveContainedProjectPath(project.path, subject);
      await readFile(resolved.absolutePath);
      const revision = await (
        options.computeRevision ?? computeCurrentRevision
      )(project.path);
      if (!revision)
        throw new Error("Artifact import requires a readable Git revision");
      const result = await service.create({
        id: values["--id"],
        kind: values["--kind"],
        title: values["--title"],
        agentId: values["--agent"],
        workId: values["--work"],
        sourceRevision: {
          gitHead: revision.sha,
          dirtyFingerprint: revision.worktreeFingerprint ?? null,
        },
        content: { type: "reference", path: resolved.relativePath },
      } as Parameters<ProjectArtifactService["create"]>[0]);
      options.output.stdout(
        `Imported ${resolved.relativePath} as ${result.artifact.id}`,
      );
      return EXIT_CODE.success;
    }
    if (action === "list" && !subject) {
      options.output.stdout(JSON.stringify(await repository.list(), null, 2));
      return EXIT_CODE.success;
    }
    if (action === "show" && subject && rest.length === 0) {
      const artifact = await repository.read(
        projectArtifactIdSchema.parse(subject),
      );
      if (!artifact) throw new Error(`Unknown artifact: ${subject}`);
      options.output.stdout(JSON.stringify(artifact, null, 2));
      return EXIT_CODE.success;
    }
    if (action === "register" && subject && rest.length === 0) {
      const result = await service.create(await input(project.path, subject));
      options.output.stdout(
        `Registered ${result.artifact.id} to ${result.location}`,
      );
      return EXIT_CODE.success;
    }
    if (
      action === "approve" &&
      subject &&
      rest.length === 2 &&
      rest[0] === "--by" &&
      rest[1]
    ) {
      const result = await service.approve(subject, rest[1]);
      options.output.stdout(`Approved ${result.artifact.id}`);
      return EXIT_CODE.success;
    }
    if (action === "supersede" && subject && rest.length === 1 && rest[0]) {
      const result = await service.supersede(
        subject,
        await input(project.path, rest[0]),
      );
      options.output.stdout(
        `Registered ${result.artifact.id}; superseded ${subject}`,
      );
      return EXIT_CODE.success;
    }
    return usage(options.output);
  } catch (error) {
    return reportCommandError(error, options.output);
  }
}
