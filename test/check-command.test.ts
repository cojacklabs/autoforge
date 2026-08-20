import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runAddCommand } from "../src/commands/add.js";
import { runCheckCommand } from "../src/commands/check.js";
import { initializeProject } from "../src/commands/init.js";
import { runStartCommand } from "../src/commands/start.js";
import { EXIT_CODE } from "../src/core/errors.js";

const TIMESTAMP = "2026-08-20T20:00:00.000Z";
const temporaryDirectories: string[] = [];

function output() {
  return { stdout: vi.fn(), stderr: vi.fn() };
}

async function createActiveProject() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-check-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({
    projectRoot,
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "init",
  });
  await runAddCommand({
    args: [
      "issue",
      "--name",
      "Guard command edits",
      "--description",
      "Exercise guardrail CLI behavior",
      "--include",
      "src/**",
      "--exclude",
      "src/generated/**",
    ],
    output: output(),
    startDirectory: projectRoot,
  });
  await runStartCommand({
    args: ["issue", "issue.guard-command-edits"],
    output: output(),
    startDirectory: projectRoot,
    now: () => new Date(TIMESTAMP),
    sessionId: () => "session.guard-command",
  });
  return projectRoot;
}

function claudeInput(projectRoot: string, filePath: string) {
  return JSON.stringify({
    session_id: "claude-session",
    cwd: projectRoot,
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: { file_path: filePath },
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("check command", () => {
  it("refreshes context and passes an in-scope advisory edit", async () => {
    const projectRoot = await createActiveProject();
    const writer = output();

    await expect(
      runCheckCommand({
        args: [
          "--refresh",
          "--path",
          "src/context/policy.ts",
          "--agent",
          "codex",
        ],
        output: writer,
        startDirectory: projectRoot,
        temporaryId: () => "context",
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(writer.stderr).not.toHaveBeenCalled();
    expect(writer.stdout).toHaveBeenCalledWith(
      expect.stringContaining("AutoForge guardrail: PASS (advisory)"),
    );
    expect(writer.stdout).toHaveBeenCalledWith(
      expect.stringContaining("Context: refreshed"),
    );
    await expect(
      readFile(path.join(projectRoot, ".autoforge/context/current.md"), "utf8"),
    ).resolves.toContain("issue.guard-command-edits");
  });

  it("returns a failing advisory report for out-of-scope edits", async () => {
    const projectRoot = await createActiveProject();
    await runCheckCommand({
      args: ["--refresh"],
      output: output(),
      startDirectory: projectRoot,
    });
    const writer = output();

    await expect(
      runCheckCommand({
        args: ["--path", "docs/outside.md", "--agent", "cursor"],
        output: writer,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.invalidState);
    expect(writer.stderr).toHaveBeenCalledWith(
      expect.stringContaining("docs/outside.md is outside active work scope"),
    );
  });

  it("hard-denies stale and out-of-scope Claude native edits", async () => {
    const projectRoot = await createActiveProject();
    await runCheckCommand({
      args: ["--refresh"],
      output: output(),
      startDirectory: projectRoot,
    });
    const currentPath = path.join(projectRoot, ".autoforge/context/current.md");
    await writeFile(currentPath, "# stale\n", "utf8");
    const staleOutput = output();

    await expect(
      runCheckCommand({
        args: ["--hook", "claude"],
        output: staleOutput,
        startDirectory: projectRoot,
        readStdin: async () =>
          claudeInput(projectRoot, path.join(projectRoot, "src/index.ts")),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(staleOutput.stderr).toHaveBeenCalledWith(
      expect.stringContaining("Canonical context is stale"),
    );

    await runCheckCommand({
      args: ["--refresh"],
      output: output(),
      startDirectory: projectRoot,
    });
    const outsideOutput = output();
    await expect(
      runCheckCommand({
        args: ["--hook", "claude"],
        output: outsideOutput,
        startDirectory: projectRoot,
        readStdin: async () =>
          claudeInput(projectRoot, path.join(projectRoot, "README.md")),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(outsideOutput.stderr).toHaveBeenCalledWith(
      expect.stringContaining("README.md is outside active work scope"),
    );
  });

  it("allows a current in-scope Claude native edit without hook output", async () => {
    const projectRoot = await createActiveProject();
    await runCheckCommand({
      args: ["--refresh"],
      output: output(),
      startDirectory: projectRoot,
    });
    const writer = output();

    await expect(
      runCheckCommand({
        args: ["--hook", "claude"],
        output: writer,
        startDirectory: projectRoot,
        readStdin: async () =>
          claudeInput(
            projectRoot,
            path.join(projectRoot, "src/context/packet.ts"),
          ),
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(writer.stdout).not.toHaveBeenCalled();
    expect(writer.stderr).not.toHaveBeenCalled();
  });

  it("explicitly installs adapter enforcement without replacing user settings", async () => {
    const projectRoot = await createActiveProject();
    await runCheckCommand({
      args: ["--refresh"],
      output: output(),
      startDirectory: projectRoot,
    });
    await mkdir(path.join(projectRoot, ".claude"), { recursive: true });
    await writeFile(
      path.join(projectRoot, ".claude/settings.json"),
      `${JSON.stringify({ permissions: { allow: ["Read"] } }, null, 2)}\n`,
    );
    const writer = output();

    await expect(
      runCheckCommand({
        args: ["--install", "--agent", "claude"],
        output: writer,
        startDirectory: projectRoot,
        temporaryId: () => "setup",
      }),
    ).resolves.toBe(EXIT_CODE.success);
    const settings = JSON.parse(
      await readFile(path.join(projectRoot, ".claude/settings.json"), "utf8"),
    );
    expect(settings).toMatchObject({
      permissions: { allow: ["Read"] },
      hooks: {
        PreToolUse: [
          expect.objectContaining({ matcher: "Edit|Write|NotebookEdit" }),
        ],
      },
    });
    expect(writer.stdout).toHaveBeenCalledWith(
      expect.stringContaining("Agent setup: configured"),
    );
  });

  it("rejects invalid arguments and malformed hook input safely", async () => {
    const writer = output();
    await expect(
      runCheckCommand({
        args: ["--install"],
        output: writer,
        startDirectory: "/missing",
      }),
    ).resolves.toBe(EXIT_CODE.usage);

    const malformed = output();
    await expect(
      runCheckCommand({
        args: ["--hook", "claude"],
        output: malformed,
        startDirectory: "/missing",
        readStdin: async () => "not-json",
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(malformed.stderr).toHaveBeenCalledWith(
      expect.stringContaining("denied edit"),
    );
  });
});
