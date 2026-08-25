import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createAgentHandoff,
  type CreateAgentHandoffInput,
} from "@cojacklabs/autoforge-protocol";
import { createAutoForgeSdk } from "@cojacklabs/autoforge-sdk";

import type { AgentProjectGateway, AgentStatus } from "./session.js";

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (arguments_: string[]) => Promise<CommandResult>;

function runCommand(
  command: string,
  arguments_: string[],
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      resolve({ exitCode: code ?? 1, stdout, stderr }),
    );
  });
}

function parseScope(context: string): { include: string[]; exclude: string[] } {
  const section =
    context.match(/## Allowed Files and Scope([\s\S]*?)(?:\n## |$)/)?.[1] ?? "";
  const includeText =
    section.match(/### Include([\s\S]*?)(?:\n### |$)/)?.[1] ?? "";
  const excludeText =
    section.match(/### Exclude([\s\S]*?)(?:\n### |$)/)?.[1] ?? "";
  const bullets = (value: string) =>
    [...value.matchAll(/^- `([^`]+)`/gm)].map((match) => match[1] as string);
  return { include: bullets(includeText), exclude: bullets(excludeText) };
}

export class LocalSdkGateway implements AgentProjectGateway {
  private readonly projectRoot: string;
  private readonly run: CommandRunner;
  private readonly sdk;

  constructor(
    projectRoot: string,
    options: { command?: string; runner?: CommandRunner } = {},
  ) {
    this.projectRoot = path.resolve(projectRoot);
    const command = options.command ?? "autoforge";
    this.run =
      options.runner ?? ((arguments_) => runCommand(command, arguments_));
    const core = (arguments_: string[]) =>
      this.run(["--project", this.projectRoot, ...arguments_]);

    this.sdk = createAutoForgeSdk({
      operations: {
        projects: async () => ({ projectRoot: this.projectRoot }),
        status: async () => {
          const [statusResult, contextResult, headResult, branchResult] =
            await Promise.all([
              core(["status", "--json"]),
              core(["context"]),
              runCommand("git", ["-C", this.projectRoot, "rev-parse", "HEAD"]),
              runCommand("git", [
                "-C",
                this.projectRoot,
                "branch",
                "--show-current",
              ]),
            ]);
          if (statusResult.exitCode !== 0 || contextResult.exitCode !== 0) {
            throw new Error(
              statusResult.stderr ||
                contextResult.stderr ||
                "Unable to load AutoForge context",
            );
          }
          const envelope = JSON.parse(statusResult.stdout) as {
            data: {
              project: { name: string };
              work: {
                active: null | {
                  kind: "task" | "issue";
                  id: `task.${string}` | `issue.${string}`;
                  name: string;
                  sessionId: string;
                };
              };
            };
          };
          const active = envelope.data.work.active;
          if (!active) throw new Error("AutoForge Agent requires active work");
          return {
            project: {
              id: `project.${envelope.data.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
              name: envelope.data.project.name,
            },
            session: { id: active.sessionId },
            activeWork: {
              kind: active.kind,
              id: active.id,
              name: active.name,
              objective: active.name,
            },
            scope: parseScope(contextResult.stdout),
            git: {
              head: headResult.stdout.trim() || "unavailable",
              ...(branchResult.stdout.trim()
                ? { branch: branchResult.stdout.trim() }
                : {}),
            },
            contextFingerprint: createHash("sha256")
              .update(contextResult.stdout)
              .digest("hex"),
          } satisfies AgentStatus;
        },
        work: async () => ({ supported: false }),
        context: async () => {
          const result = await core(["context"]);
          if (result.exitCode !== 0)
            throw new Error(result.stderr || result.stdout);
          return result.stdout;
        },
        check: async (input) => {
          const result = await core([
            "check",
            ...(input.path ? ["--path", input.path] : []),
          ]);
          return {
            allowed: result.stdout.includes("AutoForge guardrail: PASS"),
            summary: (result.stdout || result.stderr).trim(),
          };
        },
        assignments: async () => ({ supported: false }),
        decisions: async () => ({ supported: false }),
        validation: async (input) => {
          const arguments_ = ["gate", "check", "--json"];
          if (input.paths?.length)
            arguments_.push("--files", input.paths.join(","));
          const result = await core(arguments_);
          const parsed = JSON.parse(result.stdout || "{}") as {
            success?: boolean;
          };
          return {
            passed: parsed.success === true,
            summary: result.stdout.trim() || result.stderr.trim(),
          };
        },
        handoffs: async (input) => this.persistHandoff(input.handoff),
        startWork: async () => ({ supported: false }),
        completeWork: async () => ({ supported: false }),
      },
    });
  }

  async status(): Promise<AgentStatus> {
    return (await this.sdk.status()).data;
  }

  async context(): Promise<string> {
    return (await this.sdk.context()).data;
  }

  async check(relativePath: string) {
    return (await this.sdk.check({ path: relativePath })).data;
  }

  async validate(paths: string[]) {
    return (await this.sdk.validation({ paths })).data;
  }

  async handoff(input: CreateAgentHandoffInput) {
    return (await this.sdk.handoffs({ handoff: input })).data;
  }

  private async persistHandoff(input: CreateAgentHandoffInput) {
    const handoff = createAgentHandoff(input);
    const directory = path.join(this.projectRoot, ".autoforge", "handoffs");
    const target = path.join(directory, `${handoff.id}.json`);
    const temporary = `${target}.${process.pid}.tmp`;
    await mkdir(directory, { recursive: true });
    await writeFile(temporary, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
    await rename(temporary, target);
    return { location: target };
  }
}
