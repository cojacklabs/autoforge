import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  AgentContractStore,
  generateAgentContract,
} from "../contract/generator.js";
import { assertAgentContractCompatibility } from "../contract/capabilities.js";
import { reportCommandError } from "../cli/command-error.js";

export interface ContractCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}
function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge contract generate <agent-id> | contract show | contract validate",
  );
  return EXIT_CODE.usage;
}
export async function runContractCommand(
  options: ContractCommandOptions,
): Promise<ExitCode> {
  const [action, agentId] = options.args;
  if (
    !action ||
    (action === "generate"
      ? !agentId || options.args.length !== 2
      : options.args.length !== 1)
  )
    return usage(options.output);
  try {
    const project = await discoverProjectRoot({
      startDirectory: options.startDirectory,
    });
    const store = new AgentContractStore(project.path);
    if (action === "generate") {
      try {
        assertAgentContractCompatibility(agentId!);
      } catch (error) {
        options.output.stderr(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        return EXIT_CODE.notFound;
      }
      const contract = generateAgentContract({
        agentId: agentId!,
        projectRoot: project.path,
        validationCommands: ["npm test"],
      });
      await store.write(contract);
      options.output.stdout("Generated .autoforge/agent-contract.json");
      return EXIT_CODE.success;
    }
    const contract = await store.read();
    if (action === "show")
      options.output.stdout(JSON.stringify(contract, null, 2));
    else if (action === "validate")
      options.output.stdout("Agent contract is valid.");
    else return usage(options.output);
    return EXIT_CODE.success;
  } catch (error) {
    return reportCommandError(error, options.output);
  }
}
