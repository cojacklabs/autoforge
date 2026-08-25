import path from "node:path";

import {
  readProjectStatus,
  type ProjectStatus,
} from "@cojacklabs/autoforge-sdk";

import { EXIT_CODE, type ExitCode } from "../../../src/core/errors.js";
import type { LogWriter } from "../../../src/core/logger.js";
import { discoverProjectRoot } from "../../../src/core/project.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../../../src/state/kernel.js";
import { WorkRecapService } from "../../../src/work/recap.js";

export const STATUS_VIEWS = ["summary", "work", "next"] as const;
export type StatusView = (typeof STATUS_VIEWS)[number];

export interface StatusCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
}

interface StatusArguments {
  json: boolean;
  view: StatusView;
}

function usage(output: LogWriter): undefined {
  output.stderr(
    "Usage: autoforge status [--json] [--view <summary|work|next>]",
  );
  return undefined;
}

function parseArguments(
  args: readonly string[],
  output: LogWriter,
): StatusArguments | undefined {
  let json = false;
  let view: StatusView = "summary";
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--json" && !json) {
      json = true;
      continue;
    }
    if (argument === "--view") {
      const value = args[index + 1];
      if (!STATUS_VIEWS.includes(value as StatusView)) return usage(output);
      view = value as StatusView;
      index += 1;
      continue;
    }
    return usage(output);
  }
  return { json, view };
}

export async function loadProjectStatus(
  projectRoot: string,
  now?: () => Date,
): Promise<ProjectStatus> {
  const workStore = createWorkStateStore(projectRoot);
  const [{ state: work }, recap] = await Promise.all([
    workStore.read(),
    new WorkRecapService(
      workStore,
      createSessionStateStore(projectRoot),
      now ? { now } : {},
    ).read(),
  ]);
  const candidates = [...work.data.tasks, ...work.data.issues];
  const nextWork =
    candidates.find((item) => item.status === "ready") ??
    candidates.find((item) => item.status === "planned");
  const nextCommands =
    recap.status === "active"
      ? [
          "autoforge context --explain",
          "autoforge check",
          "autoforge done",
          "autoforge help",
        ]
      : [
          ...(nextWork
            ? [
                `autoforge start ${nextWork.id.startsWith("issue.") ? "issue" : "task"} ${nextWork.id}`,
              ]
            : []),
          "autoforge recap",
          "autoforge help",
        ];
  return {
    project: { name: path.basename(projectRoot), root: projectRoot },
    work: {
      state: recap.status,
      active:
        recap.status === "active"
          ? {
              kind: recap.active.kind,
              id: recap.active.id,
              name: recap.active.name,
              sessionId: recap.session.id,
              startedAt: recap.active.startedAt,
            }
          : null,
      counts: recap.actionableByStatus,
    },
    nextCommands: nextCommands.slice(0, 4),
  };
}

function renderSummary(status: ProjectStatus): string {
  const active = status.work.active;
  return [
    `AutoForge — ${status.project.name}`,
    `Status: ${status.work.state}`,
    active
      ? `Active: ${active.kind} ${active.id} — ${active.name}`
      : "Active: none",
    `Work: planned=${status.work.counts.planned} ready=${status.work.counts.ready} blocked=${status.work.counts.blocked} completed=${status.work.counts.completed}`,
    "Next:",
    ...status.nextCommands.map((command) => `  ${command}`),
  ].join("\n");
}

function renderWork(status: ProjectStatus): string {
  const counts = status.work.counts;
  const lines = [
    `AutoForge work — ${status.project.name}`,
    `Status: ${status.work.state}`,
    `Counts: planned=${counts.planned} ready=${counts.ready} active=${counts.active} blocked=${counts.blocked} completed=${counts.completed} canceled=${counts.canceled}`,
  ];
  if (status.work.active) {
    lines.push(
      `Active: ${status.work.active.kind} ${status.work.active.id} — ${status.work.active.name}`,
      `Session: ${status.work.active.sessionId}`,
      `Started: ${status.work.active.startedAt}`,
    );
  } else lines.push("Active: none");
  return lines.join("\n");
}

function renderNext(status: ProjectStatus): string {
  return [
    `AutoForge next — ${status.project.name}`,
    ...status.nextCommands.map((command) => `  ${command}`),
  ].join("\n");
}

export function renderProjectStatus(
  status: ProjectStatus,
  view: StatusView,
): string {
  if (view === "work") return renderWork(status);
  if (view === "next") return renderNext(status);
  return renderSummary(status);
}

export async function runStatusCommand(
  options: StatusCommandOptions,
): Promise<ExitCode> {
  const parsed = parseArguments(options.args, options.output);
  if (!parsed) return EXIT_CODE.usage;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const result = await readProjectStatus(() =>
    loadProjectStatus(project.path, options.now),
  );
  options.output.stdout(
    parsed.json
      ? JSON.stringify(result, null, 2)
      : renderProjectStatus(result.data, parsed.view),
  );
  return EXIT_CODE.success;
}
