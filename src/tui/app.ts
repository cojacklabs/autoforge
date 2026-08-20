import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";

import { toAutoForgeError } from "../core/errors.js";
import { TUI_VIEW_IDS, tuiViewIdSchema, type TuiViewId } from "./schemas.js";
import { renderTuiView } from "./renderer.js";
import type { TuiProjectService } from "./service.js";

export interface TuiTerminal {
  write(content: string): void;
  clear(): void;
  prompt(label: string): Promise<string | null>;
  close?(): void;
}

export interface RunTuiSessionOptions {
  service: TuiProjectService;
  terminal: TuiTerminal;
  initialView?: TuiViewId;
  color?: boolean;
  width?: number;
}

function resolveView(command: string): TuiViewId | undefined {
  const numeric = Number(command);
  if (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= TUI_VIEW_IDS.length
  )
    return TUI_VIEW_IDS[numeric - 1];
  const result = tuiViewIdSchema.safeParse(command);
  return result.success ? result.data : undefined;
}

export async function runTuiSession(
  options: RunTuiSessionOptions,
): Promise<void> {
  let current = options.initialView ?? "dashboard";
  let notice: string | undefined;
  try {
    while (true) {
      const view = await options.service.loadView(current);
      options.terminal.clear();
      options.terminal.write(
        renderTuiView(view, {
          projectName: options.service.projectName,
          ...(options.color === undefined ? {} : { color: options.color }),
          ...(options.width === undefined ? {} : { width: options.width }),
          ...(notice ? { notice } : {}),
        }),
      );
      notice = undefined;
      const answer = await options.terminal.prompt("autoforge> ");
      if (answer === null) return;
      const command = answer.trim().toLowerCase();
      if (["q", "quit", "exit"].includes(command)) return;
      if (command === "refresh" || command === "") continue;
      if (command === "help") {
        notice =
          "Choose a view by number/name; mutations require context-refresh or session-repair.";
        continue;
      }
      const requestedView = resolveView(command);
      if (requestedView) {
        current = requestedView;
        continue;
      }
      try {
        if (command === "context-refresh")
          notice = await options.service.refreshContext();
        else if (command === "session-repair")
          notice = await options.service.repairSession();
        else notice = `Unknown command: ${answer.trim()}`;
      } catch (error) {
        notice = `Error: ${toAutoForgeError(error).message}`;
      }
    }
  } finally {
    options.terminal.close?.();
  }
}

export function createNodeTuiTerminal(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): TuiTerminal {
  const readline = createInterface({ input, output });
  return {
    write(content) {
      output.write(`${content}\n`);
    },
    clear() {
      output.write("\u001b[2J\u001b[H");
    },
    async prompt(label) {
      try {
        return await readline.question(label);
      } catch (error) {
        return error instanceof Error && error.name === "AbortError"
          ? null
          : Promise.reject(error);
      }
    },
    close() {
      readline.close();
    },
  };
}
