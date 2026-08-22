import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { traceImpact } from "../traceability/impact.js";
import { TraceabilityStore } from "../traceability/store.js";

export interface TraceabilityCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge trace add <source> <relationship> <target> | trace list | trace impact <artifact> [--depth <n>] [--direction <forward|reverse|both>]",
  );
  return EXIT_CODE.usage;
}

export async function runTraceabilityCommand(
  options: TraceabilityCommandOptions,
): Promise<ExitCode> {
  const [action, ...args] = options.args;
  const store = new TraceabilityStore(options.startDirectory);
  if (action === "list" && args.length === 0) {
    const graph = await store.read();
    options.output.stdout(
      graph.links.length === 0
        ? "Trace links: 0"
        : graph.links
            .map(
              (link) =>
                `${link.id}: ${link.sourceId} --${link.relationship}--> ${link.targetId}`,
            )
            .join("\n"),
    );
    return EXIT_CODE.success;
  }
  if (action === "add" && args.length === 3) {
    const [sourceId, relationship, targetId] = args as [string, string, string];
    await store.add({
      id: `trace.${sourceId}.${relationship}.${targetId}`
        .replace(/[^a-z0-9._-]+/gi, "-")
        .toLowerCase(),
      sourceId,
      targetId,
      relationship,
      provenance: "human-cli",
      capturedAt: new Date().toISOString(),
    });
    options.output.stdout(
      `Trace link added: ${sourceId} --${relationship}--> ${targetId}`,
    );
    return EXIT_CODE.success;
  }
  if (action === "impact" && args.length >= 1) {
    const artifact = args[0]!;
    let depth = 3;
    let direction: "forward" | "reverse" | "both" = "both";
    for (let index = 1; index < args.length; index += 2) {
      const flag = args[index];
      const value = args[index + 1];
      if (flag === "--depth" && value) depth = Number(value);
      else if (
        flag === "--direction" &&
        (value === "forward" || value === "reverse" || value === "both")
      )
        direction = value;
      else return usage(options.output);
    }
    const graph = await store.read();
    const paths = traceImpact(graph.links, artifact, {
      direction,
      maxDepth: depth,
    });
    options.output.stdout(
      paths.length === 0
        ? "Trace impact: 0"
        : paths
            .map((path) => `${path.artifactId} (depth ${path.depth})`)
            .join("\n"),
    );
    return EXIT_CODE.success;
  }
  return usage(options.output);
}
