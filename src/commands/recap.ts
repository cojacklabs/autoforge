import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../state/kernel.js";
import { WorkRecapService, type WorkRecap } from "../work/recap.js";

export interface RecapCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
  now?: () => Date;
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    ...(hours > 0 ? [`${hours}h`] : []),
    ...(hours > 0 || minutes > 0 ? [`${minutes}m`] : []),
    `${seconds}s`,
  ].join(" ");
}

export function formatWorkRecap(recap: WorkRecap): string {
  const lines = [
    "AutoForge recap",
    `Status: ${recap.status}`,
    `Inventory: features=${recap.inventory.features} phases=${recap.inventory.phases} tasks=${recap.inventory.tasks} issues=${recap.inventory.issues}`,
    `Actionable: planned=${recap.actionableByStatus.planned} ready=${recap.actionableByStatus.ready} active=${recap.actionableByStatus.active} blocked=${recap.actionableByStatus.blocked} paused=${recap.actionableByStatus.paused} completed=${recap.actionableByStatus.completed} canceled=${recap.actionableByStatus.canceled}`,
  ];

  if (recap.status === "active") {
    lines.push(
      `Active: ${recap.active.kind} ${recap.active.id} — ${recap.active.name}`,
    );
    if (recap.active.kind === "task") {
      lines.push(
        `Feature: ${recap.active.feature.id} — ${recap.active.feature.name}`,
        `Phase: ${recap.active.phase.id} — ${recap.active.phase.name} (#${recap.active.phase.sequence})`,
      );
    }
    lines.push(
      `Scope include: ${recap.active.scope.include.join(", ")}`,
      `Scope exclude: ${recap.active.scope.exclude.join(", ") || "(none)"}`,
      `Session: ${recap.session.id}`,
      `Elapsed: ${formatElapsed(recap.session.elapsedSeconds)}`,
    );
  } else {
    lines.push("Active: none");
  }

  if (recap.recentSession) {
    lines.push(
      `Recent session: ${recap.recentSession.id} ended ${recap.recentSession.endedAt}`,
    );
  }
  return lines.join("\n");
}

export async function runRecapCommand(
  options: RecapCommandOptions,
): Promise<ExitCode> {
  if (options.args.length > 0) {
    options.output.stderr('Command "recap" does not accept arguments.');
    return EXIT_CODE.usage;
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const recap = await new WorkRecapService(
    createWorkStateStore(project.path),
    createSessionStateStore(project.path),
    options.now ? { now: options.now } : {},
  ).read();
  options.output.stdout(formatWorkRecap(recap));
  return EXIT_CODE.success;
}
