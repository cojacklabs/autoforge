import path from "node:path";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { createDecisionStore } from "../decisions/store.js";
import { ConstitutionStore } from "../governance/store.js";
import { DomainStore } from "../domain/store.js";
import { EvidenceStore } from "../learning/evidence-store.js";
import { ExperimentStore } from "../learning/experiment-store.js";
import { HypothesisStore } from "../learning/hypothesis-store.js";
import { ValidationEvidenceStore } from "../quality/evidence.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import { SpecificationFileStore } from "../specifications/store.js";
import { createWorkStateStore } from "../state/kernel.js";
import { StrategyStore } from "../strategy/strategy-store.js";
import { TraceabilityStore } from "../traceability/store.js";
import { projectStateToTwin } from "../twin/from-state.js";
import { buildTwinProjection } from "../twin/projection.js";
import { queryTwin } from "../twin/query.js";
import { TwinProjectionStore } from "../twin/store.js";
import { twinNodeTypeSchema } from "../twin/schemas.js";

export interface TwinCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge twin generate [--json] | twin show [--json] | twin query [--type <type>] [--relationship <name>] [--depth <n>] [--limit <n>] [--json]",
  );
  return EXIT_CODE.usage;
}

export async function runTwinCommand(
  options: TwinCommandOptions,
): Promise<ExitCode> {
  const [action, ...args] = options.args;
  const json = args.includes("--json");
  const remaining = args.filter((arg) => arg !== "--json");
  if (!action || remaining.some((arg) => arg === "--help")) {
    return usage(options.output);
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const store = new TwinProjectionStore(project.path);
  if (action === "generate") {
    if (remaining.length > 0) return usage(options.output);
    const generatedAt = (options.now ?? (() => new Date()))().toISOString();
    const hypothesisStore = new HypothesisStore(project.path);
    const experimentStore = new ExperimentStore(project.path);
    const evidenceStore = new EvidenceStore(project.path);
    const strategyStore = new StrategyStore(project.path);
    await Promise.all([
      hypothesisStore.ensure(),
      experimentStore.ensure(),
      evidenceStore.ensure(),
      strategyStore.ensure(),
    ]);
    const constitutionStore = new ConstitutionStore(project.path);
    const domainStore = new DomainStore(project.path);
    const specifications = new SpecificationRegistry(
      new SpecificationFileStore(project.path),
    );
    const traceabilityStore = new TraceabilityStore(project.path);
    const validationEvidenceStore = new ValidationEvidenceStore(project.path);
    const [
      { state: work },
      { state: decisions },
      { state: hypotheses },
      { state: experiments },
      { state: evidence },
      { state: strategy },
      constitution,
      domain,
      specificationList,
      traceGraph,
      validationEvidenceState,
    ] = await Promise.all([
      createWorkStateStore(project.path).read(),
      createDecisionStore(project.path).read(),
      hypothesisStore.state.read(),
      experimentStore.state.read(),
      evidenceStore.state.read(),
      strategyStore.state.read(),
      constitutionStore.load(),
      domainStore.load(),
      specifications.list(),
      traceabilityStore.read(),
      validationEvidenceStore.read(),
    ]);
    const projection = await store.write(
      projectStateToTwin({
        projectId: path.resolve(project.path),
        generatedAt,
        work: work.data,
        decisions: decisions.data,
        hypotheses: hypotheses.data,
        experiments: experiments.data,
        evidence: evidence.data,
        constitution,
        domain,
        specifications: specificationList,
        strategy: strategy.data,
        traceability: traceGraph,
        validationEvidence: validationEvidenceState,
      }),
    );
    options.output.stdout(
      json
        ? JSON.stringify(projection, null, 2)
        : `Digital twin generated: ${projection.nodes.length} nodes, ${projection.edges.length} edges.`,
    );
    return EXIT_CODE.success;
  }
  const projection = await store.read();
  if (!projection) {
    options.output.stderr(
      "No digital twin projection found. Run `twin generate` first.",
    );
    return EXIT_CODE.invalidState;
  }
  if (action === "show") {
    if (remaining.length > 0) return usage(options.output);
    options.output.stdout(
      json
        ? JSON.stringify(projection, null, 2)
        : `Digital twin: ${projection.nodes.length} nodes, ${projection.edges.length} edges (generated ${projection.generatedAt}).`,
    );
    return EXIT_CODE.success;
  }
  if (action !== "query") return usage(options.output);
  const types: string[] = [];
  let relationship: string | undefined;
  let maxDepth: number | undefined;
  let limit: number | undefined;
  for (let index = 0; index < remaining.length; index += 1) {
    const flag = remaining[index];
    const value = remaining[++index];
    if (!value) return usage(options.output);
    if (flag === "--type") types.push(value);
    else if (flag === "--relationship") relationship = value;
    else if (flag === "--depth") maxDepth = Number(value);
    else if (flag === "--limit") limit = Number(value);
    else return usage(options.output);
  }
  const nodeTypes = types.map((type) => twinNodeTypeSchema.parse(type));
  const result = queryTwin(projection, {
    ...(nodeTypes.length > 0 ? { nodeTypes } : {}),
    ...(relationship ? { relationship } : {}),
    ...(maxDepth !== undefined ? { maxDepth } : {}),
    ...(limit !== undefined ? { limit } : {}),
  });
  options.output.stdout(
    json
      ? JSON.stringify(result, null, 2)
      : `Digital twin query: ${result.nodes.length} nodes, ${result.edges.length} edges.`,
  );
  return EXIT_CODE.success;
}
