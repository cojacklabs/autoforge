import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const discoveryQuestionInputSchema = z
  .object({
    approved: z.boolean().optional(),
    vision: z.string().optional(),
    problem: z.string().optional(),
    users: z.array(z.string()).optional(),
    useCases: z.array(z.string()).optional(),
  })
  .passthrough();

export interface DiscoveryQuestionReport {
  complete: boolean;
  questions: string[];
}

const QUESTIONS: Record<string, string> = {
  vision: "What durable outcome should this project create?",
  problem: "What specific problem should the project solve?",
  users: "Who are the primary target users?",
  useCases: "What are the first concrete use cases?",
};

export async function identifyDiscoveryQuestions(
  sourcePath: string,
): Promise<DiscoveryQuestionReport> {
  const input = discoveryQuestionInputSchema.parse(
    JSON.parse(await readFile(path.resolve(sourcePath), "utf8")) as unknown,
  );
  const missing = Object.keys(QUESTIONS).filter((key) => {
    const value = input[key];
    return !value || (Array.isArray(value) && value.length === 0);
  });
  return {
    complete: missing.length === 0 && input.approved === true,
    questions: missing.map((key) => QUESTIONS[key] ?? ""),
  };
}
