import path from "node:path";

import type { CreateAgentHandoffInput } from "@cojacklabs/autoforge-protocol";

import type { AgentPlan } from "./schemas.js";
import type { AgentRuntime } from "./runtime.js";

export interface AgentStatus {
  project: { id: string; name: string };
  session: { id: string };
  activeWork: {
    kind: "task" | "issue";
    id: `task.${string}` | `issue.${string}`;
    name: string;
    objective: string;
  };
  scope: { include: string[]; exclude: string[] };
  git: { head: string; base?: string; branch?: string };
  contextFingerprint: string;
}

export interface AgentProjectGateway {
  status(): Promise<AgentStatus>;
  context(): Promise<string>;
  check(path: string): Promise<{ allowed: boolean; summary: string }>;
  validate(paths: string[]): Promise<{ passed: boolean; summary: string }>;
  handoff(input: CreateAgentHandoffInput): Promise<{ location: string }>;
}

export interface AgentWorkspace {
  write(relativePath: string, content: string): Promise<void>;
}

export interface AgentSessionIo {
  write(value: string): void;
  ask(question: string): Promise<string>;
  confirm(question: string): Promise<boolean>;
}

export interface AgentSessionOptions {
  runtime: AgentRuntime;
  gateway: AgentProjectGateway;
  workspace: AgentWorkspace;
  io: AgentSessionIo;
  prompt: string;
}

export interface AgentSessionResult {
  status: "clarification-declined" | "approval-declined" | "completed";
  plan: AgentPlan;
  changedFiles: string[];
  handoffLocation?: string;
}

function assertContainedPath(candidate: string): string {
  const normalized = candidate.replaceAll("\\", "/");
  if (
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").includes("..") ||
    normalized === "."
  ) {
    throw new Error(`Agent edit path escapes the project: ${candidate}`);
  }
  return normalized;
}

function renderPlan(plan: AgentPlan): string {
  const edits = plan.edits.length
    ? plan.edits.map((edit) => `- ${edit.path}: ${edit.description}`).join("\n")
    : "- No file edits";
  const risks = plan.risks.length
    ? plan.risks.map((risk) => `- ${risk}`).join("\n")
    : "- None";
  return `\nPlan: ${plan.summary}\n\nEdits:\n${edits}\n\nRisks:\n${risks}\n`;
}

export async function runAgentSession(
  options: AgentSessionOptions,
): Promise<AgentSessionResult> {
  const status = await options.gateway.status();
  const context = await options.gateway.context();
  let plan = await options.runtime.plan({ prompt: options.prompt, context });

  if (plan.clarificationQuestions.length > 0) {
    const answers: string[] = [];
    for (const question of plan.clarificationQuestions) {
      const answer = await options.io.ask(question);
      if (!answer.trim()) {
        return { status: "clarification-declined", plan, changedFiles: [] };
      }
      answers.push(`${question}\n${answer}`);
    }
    plan = await options.runtime.plan({
      prompt: options.prompt,
      context,
      clarificationAnswers: answers,
    });
    if (plan.clarificationQuestions.length > 0) {
      throw new Error(
        "The Agent could not resolve its clarification questions",
      );
    }
  }

  options.io.write(renderPlan(plan));
  if (!(await options.io.confirm("Approve this bounded plan?"))) {
    return { status: "approval-declined", plan, changedFiles: [] };
  }

  const boundedEdits = plan.edits.map((edit) => ({
    ...edit,
    path: assertContainedPath(edit.path),
  }));
  for (const edit of boundedEdits) {
    const relativePath = edit.path;
    const guardrail = await options.gateway.check(relativePath);
    if (!guardrail.allowed) {
      throw new Error(
        `AutoForge blocked ${relativePath}: ${guardrail.summary}`,
      );
    }
  }

  const changedFiles: string[] = [];
  for (const edit of boundedEdits) {
    await options.workspace.write(edit.path, edit.content);
    changedFiles.push(edit.path);
  }

  const validationPaths = (
    plan.validationPaths.length > 0 ? plan.validationPaths : changedFiles
  ).map(assertContainedPath);
  const validation = await options.gateway.validate(validationPaths);
  if (!validation.passed) {
    throw new Error(`Validation failed: ${validation.summary}`);
  }

  for await (const chunk of options.runtime.streamCompletion({
    prompt: options.prompt,
    plan,
    validationSummary: validation.summary,
  })) {
    options.io.write(chunk);
  }

  const handoff = await options.gateway.handoff({
    id: `handoff.autoforge-agent-${Date.now()}`,
    project: status.project,
    session: {
      id: status.session.id,
      fromAgent: "autoforge-agent",
      toAgent: "generic",
    },
    activeWork: status.activeWork,
    scope: status.scope,
    git: status.git,
    changedFiles: changedFiles.map((file) => ({
      path: file,
      status: "modified",
    })),
    decisions: [],
    validation: [
      {
        gateId: "agent-session",
        status: "passed",
        summary: validation.summary,
      },
    ],
    risks: plan.risks,
    openQuestions: plan.openQuestions,
    nextAction: plan.nextAction,
    contextFingerprint: status.contextFingerprint,
  });

  return {
    status: "completed",
    plan,
    changedFiles,
    handoffLocation: handoff.location,
  };
}
