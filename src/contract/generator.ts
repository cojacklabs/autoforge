import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { agentContractSchema, type AgentContract } from "./schema.js";
import { normalizeAgentId } from "./capabilities.js";

export interface AgentContractInput {
  agentId: string;
  projectRoot: string;
  activeWorkId?: string;
  workflowKind?: string;
  workflowStage?: string;
  validationCommands: string[];
}

export function generateAgentContract(
  input: AgentContractInput,
): AgentContract {
  const agentId = normalizeAgentId(input.agentId);
  return agentContractSchema.parse({
    version: "0.11.0",
    ...input,
    agentId,
    requiredActions: [
      "Read AGENTS.md and the current AutoForge context.",
      "Respect the active work scope and workflow stage.",
      "Validate before reporting completion.",
    ],
    prohibitedActions: [
      "Modify files outside the declared scope.",
      "Delete durable project memory without approval.",
      "Silently skip required validation.",
    ],
    contextCommand: 'autoforge --project "$PWD" context --explain',
    completionRequirements: [
      "Run the declared validation commands.",
      "Persist durable decisions and handoffs when required.",
    ],
  });
}

export class AgentContractStore {
  private readonly filePath: string;

  constructor(projectRoot: string) {
    this.filePath = path.join(projectRoot, ".autoforge", "agent-contract.json");
  }

  async write(contract: AgentContract): Promise<string> {
    const validated = agentContractSchema.parse(contract);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(
      temporary,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporary, this.filePath);
    return path.relative(
      path.dirname(path.dirname(this.filePath)),
      this.filePath,
    );
  }

  async read(): Promise<AgentContract> {
    return agentContractSchema.parse(
      JSON.parse(await readFile(this.filePath, "utf8")) as unknown,
    );
  }
}
