import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runTuiCommand } from "../src/commands/tui.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { runTuiSession, type TuiTerminal } from "../src/tui/app.js";
import { renderTuiView } from "../src/tui/renderer.js";
import { TUI_VIEW_IDS, tuiViewModelSchema } from "../src/tui/schemas.js";
import { TuiProjectService } from "../src/tui/service.js";

const temporaryDirectories: string[] = [];

async function createProject(initialized = true): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-tui-"));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, ".git"));
  if (initialized) await initializeProject({ projectRoot: directory });
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("TUI view contracts", () => {
  it("validates strict view models", () => {
    expect(() =>
      tuiViewModelSchema.parse({
        id: "dashboard",
        title: "Dashboard",
        summary: "Summary",
        sections: [],
        commands: [],
        extra: true,
      }),
    ).toThrow();
  });

  it("loads every planned view through application services", async () => {
    const projectRoot = await createProject();
    const service = new TuiProjectService(projectRoot);
    for (const id of TUI_VIEW_IDS) {
      const view = await service.loadView(id);
      expect(view.id).toBe(id);
      expect(view.title.length).toBeGreaterThan(0);
    }
  });

  it("renders deterministic snapshots without ANSI codes", () => {
    const output = renderTuiView(
      tuiViewModelSchema.parse({
        id: "dashboard",
        title: "Dashboard",
        summary: "Kernel summary",
        sections: [
          {
            title: "Work",
            rows: [{ label: "Status", value: "idle", tone: "muted" }],
          },
        ],
        commands: ["quit"],
      }),
      { projectName: "demo", width: 80, color: false },
    );
    expect(output).toContain("AutoForge TUI — demo");
    expect(output).toContain("Status");
    expect(output).not.toContain("\u001b[");
  });

  it("reports unavailable kernel views before initialization", async () => {
    const projectRoot = await createProject(false);
    const view = await new TuiProjectService(projectRoot).loadView("tasks");
    expect(view.summary).toContain("requires a current");
    expect(view.sections[0]?.rows[0]?.value).toBe("absent");
  });
});

describe("TUI application and command", () => {
  it("navigates by number and exits without mutating state", async () => {
    const projectRoot = await createProject();
    const writes: string[] = [];
    const answers = ["3", "quit"];
    const terminal: TuiTerminal = {
      clear: vi.fn(),
      write: (content) => writes.push(content),
      prompt: vi.fn(async () => answers.shift() ?? null),
      close: vi.fn(),
    };
    await runTuiSession({
      service: new TuiProjectService(projectRoot),
      terminal,
      color: false,
    });
    expect(writes[0]).toContain("Dashboard");
    expect(writes[1]).toContain("Features");
    expect(terminal.close).toHaveBeenCalledOnce();
  });

  it("runs session recovery only after an explicit action", async () => {
    const projectRoot = await createProject();
    const writes: string[] = [];
    const answers = ["session-repair", "quit"];
    const terminal: TuiTerminal = {
      clear: vi.fn(),
      write: (content) => writes.push(content),
      prompt: vi.fn(async () => answers.shift() ?? null),
    };

    await runTuiSession({
      service: new TuiProjectService(projectRoot),
      terminal,
      color: false,
    });

    expect(writes).toHaveLength(2);
    expect(writes[1]).toContain("Session state is healthy.");
  });

  it("prints a non-interactive snapshot", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTuiCommand({
        args: ["--snapshot", "--view", "health"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("Health"),
    );
    expect(output.stderr).not.toHaveBeenCalled();
  });

  it("rejects interactive mode without a terminal", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTuiCommand({
        args: [],
        output,
        startDirectory: projectRoot,
        interactive: false,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("--snapshot"),
    );
  });

  it("rejects unknown views without loading project state", async () => {
    const projectRoot = await createProject();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runTuiCommand({
        args: ["--view", "unknown"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("Usage:"),
    );
  });
});
