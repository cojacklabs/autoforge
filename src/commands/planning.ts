import { readFile } from "node:fs/promises";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { discoverProjectRoot } from "../core/project.js";
import { triageIntentSchema } from "../intent/triage.js";
import { planningArtifactKindSchema } from "../planning/artifacts.js";
import { PlanningArtifactStore } from "../planning/store.js";

export interface PlanningCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

const KINDS = [
  "feature-brief",
  "technical-plan",
  "design-brief",
  "user-stories",
  "acceptance-criteria",
] as const;

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge planning list [--source <intent.json>] | autoforge planning show <kind> [--source <intent.json>]",
  );
  return EXIT_CODE.usage;
}

export async function runPlanningCommand(
  options: PlanningCommandOptions,
): Promise<ExitCode> {
  const [action, subject, ...argumentsAfterSubject] = options.args;
  if (action !== "list" && action !== "show") return usage(options.output);
  let sourceFile: string | undefined;
  if (action === "list") {
    if (subject !== undefined) {
      if (subject !== "--source" || argumentsAfterSubject.length !== 1)
        return usage(options.output);
      sourceFile = argumentsAfterSubject[0];
    } else if (argumentsAfterSubject.length > 0) return usage(options.output);
  } else {
    if (!subject || !KINDS.includes(subject as (typeof KINDS)[number]))
      return usage(options.output);
    if (argumentsAfterSubject.length > 0) {
      if (
        argumentsAfterSubject.length !== 2 ||
        argumentsAfterSubject[0] !== "--source"
      )
        return usage(options.output);
      sourceFile = argumentsAfterSubject[1];
    }
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const store = new PlanningArtifactStore(project.path);
  let intent: ReturnType<typeof triageIntentSchema.parse> | undefined;
  if (sourceFile) {
    const resolved = await resolveContainedProjectPath(
      project.path,
      sourceFile,
    );
    intent = triageIntentSchema.parse(
      JSON.parse(await readFile(resolved.absolutePath, "utf8")) as unknown,
    );
  }
  if (action === "show") {
    const kind = planningArtifactKindSchema.parse(subject);
    const artifact = await store.read(kind);
    options.output.stdout(
      JSON.stringify(
        {
          ...artifact,
          fresh: intent
            ? await store.isFresh(kind, artifact.sourceFingerprint)
            : null,
        },
        null,
        2,
      ),
    );
    return EXIT_CODE.success;
  }
  const artifacts = [];
  for (const kind of KINDS) {
    try {
      const artifact = await store.read(kind);
      artifacts.push({
        kind,
        generatedAt: artifact.generatedAt,
        fresh: intent
          ? await store.isFresh(kind, artifact.sourceFingerprint)
          : null,
      });
    } catch {
      continue;
    }
  }
  options.output.stdout(JSON.stringify(artifacts, null, 2));
  return EXIT_CODE.success;
}
