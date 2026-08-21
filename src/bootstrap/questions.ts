import { readFile } from "node:fs/promises";
import path from "node:path";

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
  const input = JSON.parse(
    await readFile(path.resolve(sourcePath), "utf8"),
  ) as Record<string, unknown>;
  const missing = Object.keys(QUESTIONS).filter((key) => {
    const value = input[key];
    return !value || (Array.isArray(value) && value.length === 0);
  });
  return {
    complete: missing.length === 0 && input.approved === true,
    questions: missing.map((key) => QUESTIONS[key] ?? ""),
  };
}
