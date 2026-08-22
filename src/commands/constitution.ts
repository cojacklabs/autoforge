import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import { discoverProjectRoot } from "../core/project.js";
import { evaluateGovernance } from "../governance/evaluate.js";
import { ConstitutionStore } from "../governance/store.js";
import type { ConstitutionArtifact } from "../governance/schemas.js";
import type { LogWriter } from "../core/logger.js";

export interface ConstitutionCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge constitution init | constitution list | constitution show <id> | constitution check <objective>",
  );
  return EXIT_CODE.usage;
}

function notInitialized(output: LogWriter): ExitCode {
  output.stderr(
    "No project constitution found. Run `constitution init` first.",
  );
  return EXIT_CODE.invalidState;
}

function defaultConstitution(): ConstitutionArtifact {
  return {
    id: "constitution.project.default",
    name: "Project Constitution",
    purpose: "Protect human-approved project intent.",
    source: "human-approved",
    updatedAt: new Date().toISOString(),
    rules: [
      {
        id: "constitution.project.no-silent-drift",
        title: "No silent drift",
        statement: "Work MUST remain within the approved project scope.",
        level: "MUST",
        enforcement: "managed",
        scope: { paths: [], workKinds: [], releases: [], tags: [] },
        rationale: "Project intent requires explicit change decisions.",
        nonGoals: [],
      },
    ],
  };
}

export async function runConstitutionCommand(
  options: ConstitutionCommandOptions,
): Promise<ExitCode> {
  const [action, subject, ...rest] = options.args;
  if (!action || rest.length > 0) return usage(options.output);
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const store = new ConstitutionStore(project.path);
  if (action === "init" && !subject) {
    await store.save(defaultConstitution());
    options.output.stdout("Initialized project constitution.");
    return EXIT_CODE.success;
  }
  if (action === "list" && !subject) {
    const constitution = await store.load();
    if (!constitution) return notInitialized(options.output);
    options.output.stdout(
      constitution.rules
        .map((rule) => `${rule.id} [${rule.enforcement}] — ${rule.title}`)
        .join("\n"),
    );
    return EXIT_CODE.success;
  }
  if (action === "show" && subject) {
    const constitution = await store.load();
    if (!constitution) return notInitialized(options.output);
    const rule = constitution.rules.find(
      (candidate) => candidate.id === subject,
    );
    if (!rule) return EXIT_CODE.notFound;
    options.output.stdout(JSON.stringify(rule, null, 2));
    return EXIT_CODE.success;
  }
  if (action === "check" && subject) {
    const constitution = await store.load();
    if (!constitution) return notInitialized(options.output);
    const evaluations = evaluateGovernance(constitution, {
      objective: subject,
    });
    options.output.stdout(JSON.stringify(evaluations, null, 2));
    return evaluations.some((evaluation) => evaluation.status === "blocked")
      ? EXIT_CODE.conflict
      : EXIT_CODE.success;
  }
  return usage(options.output);
}
