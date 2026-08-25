import { readFile } from "node:fs/promises";

import { assessIntent } from "@cojacklabs/autoforge-sdk";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { discoverProjectRoot } from "../core/project.js";
import { intentAssessmentInputSchema } from "../intent/service.js";
import { planningArtifactKindSchema } from "../planning/artifacts.js";
import { PlanningArtifactStore } from "../planning/store.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import { SpecificationFileStore } from "../specifications/store.js";
import { specificationSchema } from "../specifications/schemas.js";
import { registerKnowledgeSpecification } from "./knowledge.js";
import { inputSchemaJson } from "../input-schemas/catalog.js";
import { reportCommandError } from "../cli/command-error.js";

export interface IntentCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge intent assess <json-file> --kind <implementation|research|architecture|design|planning|data|security> [--artifact <kind>] [--persist]",
  );
  return EXIT_CODE.usage;
}

export async function runIntentCommand(
  options: IntentCommandOptions,
): Promise<ExitCode> {
  const [action, file, ...flags] = options.args;
  if (action === "assess" && file === "--schema" && flags.length === 0) {
    options.output.stdout(
      JSON.stringify(inputSchemaJson("intent-assess"), null, 2),
    );
    return EXIT_CODE.success;
  }
  if (action === "register") {
    if (!file || flags.length > 0) return usage(options.output);
    const project = await discoverProjectRoot({
      startDirectory: options.startDirectory,
    });
    try {
      const result = await registerKnowledgeSpecification(
        project.path,
        file,
        "intent",
      );
      options.output.stdout(`Registered ${result.id} to ${result.path}`);
    } catch (error) {
      return reportCommandError(error, options.output);
    }
    return EXIT_CODE.success;
  }
  if (action !== "assess" || !file) return usage(options.output);
  let workKind: string | undefined;
  const artifacts: string[] = [];
  let persist = false;
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--persist") {
      if (persist) return usage(options.output);
      persist = true;
      continue;
    }
    const value = flags[index + 1];
    if ((flag !== "--kind" && flag !== "--artifact") || !value)
      return usage(options.output);
    index += 1;
    if (flag === "--kind") {
      if (workKind !== undefined) return usage(options.output);
      workKind = value;
    } else artifacts.push(value);
  }
  if (!workKind) return usage(options.output);
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const resolved = await resolveContainedProjectPath(project.path, file);
  const input = JSON.parse(
    await readFile(resolved.absolutePath, "utf8"),
  ) as unknown;
  const parsed = intentAssessmentInputSchema.parse({
    intent: input,
    workKind,
    artifacts: artifacts.map((artifact) =>
      planningArtifactKindSchema.parse(artifact),
    ),
  });
  const result = assessIntent(parsed).data;
  const persisted = persist
    ? await Promise.all(
        result.artifacts.map((artifact) =>
          new PlanningArtifactStore(project.path).write(artifact),
        ),
      )
    : [];
  options.output.stdout(JSON.stringify({ ...result, persisted }, null, 2));
  return EXIT_CODE.success;
}
