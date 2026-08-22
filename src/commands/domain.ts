import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { evaluateDomainInvariants } from "../domain/evaluate.js";
import { DomainStore } from "../domain/store.js";
import type { DomainArtifact } from "../domain/schemas.js";

export interface DomainCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge domain init | domain list | domain show <id> | domain check",
  );
  return EXIT_CODE.usage;
}

function defaultDomain(): DomainArtifact {
  return {
    id: "domain-artifact.project",
    concepts: [],
    relationships: [],
    invariants: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function runDomainCommand(
  options: DomainCommandOptions,
): Promise<ExitCode> {
  const [action, subject, ...rest] = options.args;
  if (!action || rest.length > 0) return usage(options.output);
  if (!["init", "list", "show", "check"].includes(action)) {
    return usage(options.output);
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const store = new DomainStore(project.path);
  if (action === "init" && !subject) {
    await store.save(defaultDomain());
    options.output.stdout("Initialized domain artifact.");
    return EXIT_CODE.success;
  }
  const artifact = await store.load();
  if (action === "list" && !subject) {
    options.output.stdout(
      artifact.concepts
        .map((concept) => `${concept.id} — ${concept.name}`)
        .join("\n"),
    );
    return EXIT_CODE.success;
  }
  if (action === "show" && subject) {
    const concept = artifact.concepts.find(
      (candidate) => candidate.id === subject,
    );
    if (!concept) return EXIT_CODE.notFound;
    options.output.stdout(JSON.stringify(concept, null, 2));
    return EXIT_CODE.success;
  }
  if (action === "check" && !subject) {
    const evaluations = evaluateDomainInvariants(artifact.invariants);
    options.output.stdout(JSON.stringify(evaluations, null, 2));
    return evaluations.some((evaluation) => evaluation.status === "violated")
      ? EXIT_CODE.conflict
      : EXIT_CODE.success;
  }
  return usage(options.output);
}
