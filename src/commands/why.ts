import { createDecisionStore } from "../decisions/store.js";
import {
  searchDecisions,
  type DecisionSearchMatch,
} from "../decisions/search.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { EvidenceStore } from "../learning/evidence-store.js";

export interface WhyCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

interface ParsedWhyArguments {
  query: string;
  relatedWork: string[];
  includeSuperseded: boolean;
  limit: number;
}

function usageError(output: LogWriter, message: string): undefined {
  output.stderr(message);
  output.stderr('Run "autoforge help" for usage.');
  return undefined;
}

function parseWhyArguments(
  args: readonly string[],
  output: LogWriter,
): ParsedWhyArguments | undefined {
  let query = "";
  let includeSuperseded = false;
  let limit = 10;
  const relatedWork: string[] = [];
  const seenSingleFlags = new Set<string>();

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--history") {
      if (includeSuperseded) {
        return usageError(
          output,
          "Option --history may only be provided once.",
        );
      }
      includeSuperseded = true;
      continue;
    }
    if (flag !== "--query" && flag !== "--work" && flag !== "--limit") {
      return usageError(output, `Unknown why option: ${flag ?? "<missing>"}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return usageError(output, `Option ${flag} requires a value.`);
    }
    index += 1;
    if (flag === "--work") {
      relatedWork.push(value);
      continue;
    }
    if (seenSingleFlags.has(flag)) {
      return usageError(output, `Option ${flag} may only be provided once.`);
    }
    seenSingleFlags.add(flag);
    if (flag === "--query") {
      query = value;
    } else {
      limit = Number(value);
      if (!Number.isInteger(limit) || limit <= 0) {
        return usageError(output, "Option --limit must be a positive integer.");
      }
    }
  }

  if (
    query.trim().length === 0 &&
    relatedWork.length === 0 &&
    !includeSuperseded
  ) {
    return usageError(output, "Provide --query, --work, or --history.");
  }
  return { query, relatedWork, includeSuperseded, limit };
}

export function formatDecisionMatches(
  matches: readonly DecisionSearchMatch[],
  evidenceByDecision?: ReadonlyMap<string, readonly string[]>,
): string {
  if (matches.length === 0) {
    return "No matching decisions.";
  }

  const blocks = matches.map(
    ({ decision, reasons, score, supersededBy }, index) => {
      const lines = [
        `[${index + 1}] ${decision.id} (score ${score}, ${decision.status})`,
        `Statement: ${decision.statement}`,
        `Reasoning: ${decision.reasoning}`,
        `Consequences: ${decision.consequences.join(" | ")}`,
        `Scope: ${decision.scope.join(", ")}`,
        `Keywords: ${decision.keywords.join(", ")}`,
        `Related work: ${decision.relatedWork.join(", ") || "(none)"}`,
        `Matched: ${reasons.join("; ")}`,
      ];
      if (decision.supersedes) {
        lines.push(`Supersedes: ${decision.supersedes}`);
      }
      if (supersededBy) {
        lines.push(`Superseded by: ${supersededBy}`);
      }
      const evidenceIds = evidenceByDecision?.get(decision.id);
      if (evidenceIds && evidenceIds.length > 0) {
        lines.push(`Evidence: ${evidenceIds.join(", ")}`);
      }
      return lines.join("\n");
    },
  );
  return [`Decision matches: ${matches.length}`, ...blocks].join("\n\n");
}

export async function runWhyCommand(
  options: WhyCommandOptions,
): Promise<ExitCode> {
  const parsed = parseWhyArguments(options.args, options.output);
  if (!parsed) {
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const { state } = await createDecisionStore(project.path).read();
  const matches = searchDecisions(state.data, parsed);

  const evidenceStore = new EvidenceStore(project.path);
  await evidenceStore.ensure();
  const { state: evidenceState } = await evidenceStore.state.read();
  const evidenceByDecision = new Map<string, string[]>();
  for (const record of evidenceState.data.evidence) {
    if (!record.resultingDecision) {
      continue;
    }
    const existing = evidenceByDecision.get(record.resultingDecision);
    if (existing) {
      existing.push(record.id);
    } else {
      evidenceByDecision.set(record.resultingDecision, [record.id]);
    }
  }

  options.output.stdout(formatDecisionMatches(matches, evidenceByDecision));
  return EXIT_CODE.success;
}
