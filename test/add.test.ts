import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runAddCommand } from "../src/commands/add.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createWorkStateStore } from "../src/state/kernel.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-add-"));
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function output() {
  return { stdout: vi.fn(), stderr: vi.fn() };
}

describe("add command", () => {
  it("creates all work kinds from a nested project directory", async () => {
    const projectRoot = await createProject();
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const writer = output();
    const run = (args: string[]) =>
      runAddCommand({ args, output: writer, startDirectory: nested });

    await expect(
      run([
        "feature",
        "--name",
        "Control Kernel",
        "--description",
        "Persistent work control",
      ]),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      run([
        "phase",
        "--feature",
        "feature.control-kernel",
        "--name",
        "CLI",
        "--description",
        "Expose work commands",
      ]),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      run([
        "task",
        "--phase",
        "phase.cli",
        "--name",
        "Add command",
        "--description",
        "Wire work creation",
        "--include",
        "src/commands/add.ts",
        "--exclude",
        "dist/**",
      ]),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      run([
        "issue",
        "--name",
        "Check output",
        "--description",
        "Verify command output",
        "--include",
        "test/add.test.ts",
      ]),
    ).resolves.toBe(EXIT_CODE.success);

    await expect(
      createWorkStateStore(projectRoot).read(),
    ).resolves.toMatchObject({
      state: {
        revision: 4,
        data: {
          features: [{ id: "feature.control-kernel" }],
          phases: [{ id: "phase.cli" }],
          tasks: [{ id: "task.add-command" }],
          issues: [{ id: "issue.check-output" }],
        },
      },
    });
    expect(writer.stdout).toHaveBeenLastCalledWith(
      "Added issue issue.check-output (revision 4).",
    );
  });

  it.each([
    { args: [], message: "Expected add kind" },
    {
      args: ["feature", "--name", "Missing description"],
      message: "--name and --description",
    },
    {
      args: [
        "task",
        "--phase",
        "phase.cli",
        "--name",
        "Missing scope",
        "--description",
        "No include",
      ],
      message: "At least one --include",
    },
  ])("returns usage for invalid arguments", async ({ args, message }) => {
    const writer = output();

    await expect(
      runAddCommand({ args, output: writer, startDirectory: process.cwd() }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(writer.stderr.mock.calls[0]?.[0]).toContain(message);
  });

  it("rejects invalid scope as usage without changing state", async () => {
    const projectRoot = await createProject();
    const writer = output();

    await expect(
      runAddCommand({
        args: [
          "issue",
          "--name",
          "Escape",
          "--description",
          "Invalid scope",
          "--include",
          "../outside",
        ],
        output: writer,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    await expect(
      createWorkStateStore(projectRoot).read(),
    ).resolves.toMatchObject({ state: { revision: 0 } });
  });
});
