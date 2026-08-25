import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";

export const DEFAULT_OPENAI_AGENT_MODEL = "gpt-5.6-sol";

export interface OpenAIModelOptions {
  apiKey: string;
  modelId?: string;
}

export function createOpenAIAgentModel(
  options: OpenAIModelOptions,
): ReturnType<OpenAIProvider> {
  const provider = createOpenAI({ apiKey: options.apiKey });
  return provider(options.modelId ?? DEFAULT_OPENAI_AGENT_MODEL);
}
