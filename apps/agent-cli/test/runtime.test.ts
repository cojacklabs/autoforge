import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";

import { AiSdkAgentRuntime } from "../src/runtime.js";

describe("AiSdkAgentRuntime", () => {
  it("streams completion text through the AI SDK agent", async () => {
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: "Validated" },
            { type: "text-delta", id: "text-1", delta: " successfully" },
            { type: "text-end", id: "text-1" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              logprobs: undefined,
              usage: {
                inputTokens: {
                  total: 1,
                  noCache: 1,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: {
                  total: 2,
                  text: 2,
                  reasoning: undefined,
                },
              },
            },
          ],
        }),
      }),
    });
    const runtime = new AiSdkAgentRuntime(model);
    const chunks: string[] = [];
    for await (const chunk of runtime.streamCompletion({
      prompt: "Test",
      plan: {
        summary: "Test",
        clarificationQuestions: [],
        edits: [],
        validationPaths: [],
        risks: [],
        openQuestions: [],
        nextAction: "Done",
      },
      validationSummary: "passed",
    })) {
      chunks.push(chunk);
    }
    expect(chunks.join("")).toBe("Validated successfully");
  });
});
