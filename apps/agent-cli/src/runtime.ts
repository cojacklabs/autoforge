import type { LanguageModel } from "ai";
import { Output, ToolLoopAgent, stepCountIs } from "ai";

import { agentPlanSchema, type AgentPlan } from "./schemas.js";

const INSTRUCTIONS = `You are the experimental AutoForge coding agent.
Use the supplied canonical project context as project truth.
Return a bounded implementation plan. Every edit must use a project-relative path.
Do not propose edits outside the active AutoForge scope.
Ask clarification questions only when a missing answer materially changes the implementation.
Never include credentials, raw transcripts, or machine-specific absolute paths.`;

export interface AgentRuntime {
  plan(input: {
    prompt: string;
    context: string;
    clarificationAnswers?: string[];
  }): Promise<AgentPlan>;
  streamCompletion(input: {
    prompt: string;
    plan: AgentPlan;
    validationSummary: string;
  }): AsyncIterable<string>;
}

function createPlanningAgent(model: LanguageModel) {
  return new ToolLoopAgent({
    model,
    instructions: INSTRUCTIONS,
    output: Output.object({ schema: agentPlanSchema }),
    stopWhen: stepCountIs(4),
  });
}

function createResponseAgent(model: LanguageModel) {
  return new ToolLoopAgent({
    model,
    instructions:
      "Summarize completed AutoForge work concisely. Report validation and the next action.",
    stopWhen: stepCountIs(2),
  });
}

export class AiSdkAgentRuntime implements AgentRuntime {
  private readonly planningAgent: ReturnType<typeof createPlanningAgent>;
  private readonly responseAgent: ReturnType<typeof createResponseAgent>;

  constructor(model: LanguageModel) {
    this.planningAgent = createPlanningAgent(model);
    this.responseAgent = createResponseAgent(model);
  }

  async plan(input: {
    prompt: string;
    context: string;
    clarificationAnswers?: string[];
  }): Promise<AgentPlan> {
    const result = await this.planningAgent.generate({
      prompt: [
        `User intent:\n${input.prompt}`,
        `Canonical context:\n${input.context}`,
        input.clarificationAnswers?.length
          ? `Clarification answers:\n${input.clarificationAnswers.join("\n")}`
          : "No clarification answers have been supplied.",
      ].join("\n\n"),
    });
    return agentPlanSchema.parse(result.output);
  }

  async *streamCompletion(input: {
    prompt: string;
    plan: AgentPlan;
    validationSummary: string;
  }): AsyncIterable<string> {
    const result = await this.responseAgent.stream({
      prompt: `Intent: ${input.prompt}\nPlan: ${input.plan.summary}\nValidation: ${input.validationSummary}`,
    });
    yield* result.textStream;
  }
}
