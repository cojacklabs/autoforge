import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { createDefaultAgentRegistry } from "../agents/registry.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";

export interface AgentsCommandOptions {
  args: readonly string[];
  output: LogWriter;
  homeDirectory?: string;
}

export async function runAgentsCommand(
  options: AgentsCommandOptions,
): Promise<ExitCode> {
  if (
    options.args.length > 1 ||
    (options.args[0] && options.args[0] !== "list")
  ) {
    options.output.stderr("Usage: autoforge agents list");
    return EXIT_CODE.usage;
  }
  const adapters = createDefaultAgentRegistry().list();
  await new GlobalWorkspaceStore(options.homeDirectory)
    .recordAgentCapabilities(
      Object.fromEntries(
        adapters.map((adapter) => [adapter.id, adapter.capabilities]),
      ),
    )
    .catch(() => undefined);
  options.output.stdout(
    adapters
      .map(
        (adapter) =>
          `${adapter.id}\tsetup=${adapter.capabilities.setup}\tcontext=${adapter.capabilities.contextDelivery.join(",")}\tenforcement=${adapter.capabilities.enforcement}`,
      )
      .join("\n"),
  );
  return EXIT_CODE.success;
}
