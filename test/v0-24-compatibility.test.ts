import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadProjectStatus } from "../apps/core-cli/src/status.js";
import { runTuiCommand } from "../src/commands/tui.js";
import { EXIT_CODE } from "../src/core/errors.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";

const temporaryDirectories: string[] = [];

async function copyFixture(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-v0-24-fixture-"),
  );
  temporaryDirectories.push(projectRoot);
  await cp(path.resolve("test/fixtures/v0-24-project"), projectRoot, {
    recursive: true,
  });
  await mkdir(path.join(projectRoot, ".git"));
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("v0.24 project compatibility", () => {
  it("loads durable work and session state without migration or data loss", async () => {
    const projectRoot = await copyFixture();
    const workPath = path.join(projectRoot, ".autoforge/state/work.json");
    const sessionPath = path.join(projectRoot, ".autoforge/state/session.json");
    const before = await Promise.all([
      readFile(workPath, "utf8"),
      readFile(sessionPath, "utf8"),
    ]);

    const [{ state: work }, { state: sessions }, status] = await Promise.all([
      createWorkStateStore(projectRoot).read(),
      createSessionStateStore(projectRoot).read(),
      loadProjectStatus(projectRoot),
    ]);

    expect(work.revision).toBe(24);
    expect(work.data.tasks[0]).toMatchObject({
      id: "task.resume-v0-24-project",
      status: "ready",
    });
    expect(sessions.data.previous[0]?.id).toBe("session.v0-24-fixture");
    expect(status.work.counts.ready).toBe(1);
    expect(status.nextCommands[0]).toBe(
      "autoforge start task task.resume-v0-24-project",
    );
    await expect(
      Promise.all([readFile(workPath, "utf8"), readFile(sessionPath, "utf8")]),
    ).resolves.toEqual(before);
  });

  it("keeps the legacy TUI command as a documented read-only status alias", async () => {
    const projectRoot = await copyFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runTuiCommand({
        args: ["--snapshot", "--view", "next", "--no-color"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("autoforge start task task.resume-v0-24-project"),
    );
    expect(output.stderr).not.toHaveBeenCalled();
  });
});
