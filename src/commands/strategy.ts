import { z } from "zod";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { createDecisionStore } from "../decisions/store.js";
import { DecisionService } from "../decisions/service.js";
import { EvidenceService } from "../learning/evidence-service.js";
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
import { createWorkStateStore } from "../state/kernel.js";
import {
  strategyDecisionSchema,
  strategyFactorLevelSchema,
  strategyFactorsSchema,
  type StrategyDecision,
  type StrategyFactors,
} from "../strategy/strategy-schemas.js";
import { StrategyService } from "../strategy/strategy-service.js";
import { StrategyStore } from "../strategy/strategy-store.js";

export interface StrategyCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

const FACTOR_FLAGS = {
  "--alignment": "alignment",
  "--value": "value",
  "--risk": "risk",
  "--cost": "cost",
  "--evidence-strength": "evidenceStrength",
  "--dependency-pressure": "dependencyPressure",
  "--complexity": "complexity",
  "--release-constraint": "releaseConstraint",
} as const;

const SINGLE_FLAGS = new Set([
  ...Object.keys(FACTOR_FLAGS),
  "--decision",
  "--rationale",
  "--supersedes",
]);
const REPEATABLE_FLAGS = new Set(["--evidence"]);

function usageError(output: LogWriter, message: string): undefined {
  output.stderr(message);
  output.stderr('Run "autoforge help" for usage.');
  return undefined;
}

const LIST_FLAGS = new Set(["--decision", "--work"]);

interface ParsedListArguments {
  decision?: string;
  work?: string;
}

function parseListArguments(
  rest: readonly string[],
  output: LogWriter,
): ParsedListArguments | undefined {
  const singleValues = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag || !LIST_FLAGS.has(flag)) {
      return usageError(
        output,
        `Unknown strategy option: ${flag ?? "<missing>"}`,
      );
    }
    if (!value || value.startsWith("--")) {
      return usageError(output, `Option ${flag} requires a value.`);
    }
    if (singleValues.has(flag)) {
      return usageError(output, `Option ${flag} may only be provided once.`);
    }
    singleValues.set(flag, value);
  }
  const decisionValue = singleValues.get("--decision");
  const workValue = singleValues.get("--work");
  return {
    ...(decisionValue ? { decision: decisionValue } : {}),
    ...(workValue ? { work: workValue } : {}),
  };
}

interface ParsedAssessArguments {
  workId: string;
  factors: StrategyFactors;
  decision: string;
  rationale: string;
  evidenceIds: string[];
  supersedes?: string;
}

function parseAssessArguments(
  workId: string | undefined,
  rest: readonly string[],
  output: LogWriter,
): ParsedAssessArguments | undefined {
  if (!workId) {
    return usageError(
      output,
      "A work item id is required for strategy assess.",
    );
  }
  const singleValues = new Map<string, string>();
  const repeatableValues = new Map<string, string[]>(
    [...REPEATABLE_FLAGS].map((flag) => [flag, []]),
  );
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag || (!SINGLE_FLAGS.has(flag) && !REPEATABLE_FLAGS.has(flag))) {
      return usageError(
        output,
        `Unknown strategy option: ${flag ?? "<missing>"}`,
      );
    }
    if (!value || value.startsWith("--")) {
      return usageError(output, `Option ${flag} requires a value.`);
    }
    if (SINGLE_FLAGS.has(flag)) {
      if (singleValues.has(flag)) {
        return usageError(output, `Option ${flag} may only be provided once.`);
      }
      singleValues.set(flag, value);
    } else {
      repeatableValues.get(flag)?.push(value);
    }
  }

  const rawFactors: Record<string, string> = {};
  for (const [flag, key] of Object.entries(FACTOR_FLAGS)) {
    const value = singleValues.get(flag);
    if (!value) {
      return usageError(output, `Option ${flag} is required.`);
    }
    const parsedLevel = strategyFactorLevelSchema.safeParse(value);
    if (!parsedLevel.success) {
      return usageError(
        output,
        `Option ${flag} must be one of: low, medium, high, uncertain.`,
      );
    }
    rawFactors[key] = parsedLevel.data;
  }
  const parsedFactors = strategyFactorsSchema.safeParse(rawFactors);
  if (!parsedFactors.success) {
    return usageError(
      output,
      parsedFactors.error.issues[0]?.message ?? "Invalid strategy factors.",
    );
  }
  const factors = parsedFactors.data;

  const decision = singleValues.get("--decision");
  const rationale = singleValues.get("--rationale");
  if (!decision) {
    return usageError(output, "Option --decision is required.");
  }
  if (!strategyDecisionSchema.safeParse(decision).success) {
    return usageError(
      output,
      "Option --decision must be one of: now, next, later, backlog.",
    );
  }
  if (!rationale) {
    return usageError(output, "Option --rationale is required.");
  }

  const supersedes = singleValues.get("--supersedes");
  return {
    workId,
    factors,
    decision,
    rationale,
    evidenceIds: repeatableValues.get("--evidence") ?? [],
    ...(supersedes ? { supersedes } : {}),
  };
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge strategy assess <work-id> --alignment <low|medium|high|uncertain> --value <..> --risk <..> --cost <..> --evidence-strength <..> --dependency-pressure <..> --complexity <..> --release-constraint <..> --decision <now|next|later|backlog> --rationale <text> [--evidence <evidence-id>] [--supersedes <strategy-id>] | strategy list [--decision <label>] [--work <work-id>] | strategy show <id> | strategy history <work-id>",
  );
  return EXIT_CODE.usage;
}

export async function runStrategyCommand(
  options: StrategyCommandOptions,
): Promise<ExitCode> {
  const [action, target, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const workStore = createWorkStateStore(project.path);
  const strategyStore = new StrategyStore(project.path);
  const evidenceService = new EvidenceService(
    new EvidenceStore(project.path),
    new ExperimentStore(project.path),
    new HypothesisStore(project.path),
    workStore,
  );
  const decisionService = new DecisionService(
    createDecisionStore(project.path),
    workStore,
    { evidenceService },
  );
  const service = new StrategyService(
    strategyStore,
    decisionService,
    evidenceService,
    workStore,
  );

  try {
    if (action === "assess") {
      const parsed = parseAssessArguments(target, rest, options.output);
      if (!parsed) {
        return EXIT_CODE.usage;
      }
      const { workId, factors, decision, rationale, evidenceIds, supersedes } =
        parsed;
      const result = await service.assess({
        workId,
        factors,
        decision: decision as StrategyDecision,
        rationale,
        evidenceIds,
        ...(supersedes ? { supersedes } : {}),
      });
      options.output.stdout(
        `Recorded strategy assessment ${result.assessment.id} (revision ${result.revision}); linked decision ${result.assessment.resultingDecision}.`,
      );
      return EXIT_CODE.success;
    }

    if (action === "list") {
      const parsedList = parseListArguments(
        target === undefined ? [] : [target, ...rest],
        options.output,
      );
      if (!parsedList) {
        return EXIT_CODE.usage;
      }
      const decisionFilter = parsedList.decision;
      const workFilter = parsedList.work;
      await strategyStore.ensure();
      const { state } = await strategyStore.state.read();
      const rows = state.data.assessments
        .filter((assessment) => assessment.status === "active")
        .filter(
          (assessment) =>
            !decisionFilter || assessment.decision === decisionFilter,
        )
        .filter((assessment) => !workFilter || assessment.workId === workFilter)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map(
          (assessment) =>
            `${assessment.id} [${assessment.decision}] ${assessment.workId} — ${assessment.rationale}`,
        )
        .join("\n");
      options.output.stdout(rows);
      return EXIT_CODE.success;
    }

    if (action === "show" && target) {
      await strategyStore.ensure();
      const { state } = await strategyStore.state.read();
      const found = state.data.assessments.find((item) => item.id === target);
      if (!found) return EXIT_CODE.notFound;
      options.output.stdout(JSON.stringify(found, null, 2));
      return EXIT_CODE.success;
    }

    if (action === "history" && target) {
      const results = await service.history(target);
      options.output.stdout(
        results
          .map(
            (assessment) =>
              `${assessment.id} [${assessment.decision}] (${assessment.status}) — ${assessment.rationale}`,
          )
          .join("\n"),
      );
      return EXIT_CODE.success;
    }

    return usage(options.output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      usageError(
        options.output,
        error.issues[0]?.message ?? "Invalid strategy input",
      );
      return EXIT_CODE.usage;
    }
    throw error;
  }
}
