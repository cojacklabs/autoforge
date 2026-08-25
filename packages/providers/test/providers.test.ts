import { describe, expect, it } from "vitest";

import {
  createOpenAIAgentModel,
  DEFAULT_OPENAI_AGENT_MODEL,
} from "../src/index.js";

describe("OpenAI provider factory", () => {
  it("uses the current default model without making a network request", () => {
    const model = createOpenAIAgentModel({ apiKey: "test-key" });
    expect(DEFAULT_OPENAI_AGENT_MODEL).toBe("gpt-5.6-sol");
    expect(model.modelId).toBe(DEFAULT_OPENAI_AGENT_MODEL);
  });
});
