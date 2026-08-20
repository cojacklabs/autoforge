import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { runStartCommand } from "../src/commands/start.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createDoctrineSessionStore } from "../src/doctrine/session.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../src/state/kernel.js";
import { WorkService } from "../src/work/service.js";

const temporaryDirectories: string[] = [];

async function createFixture() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "autoforge-start-"));
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  const store = createWorkStateStore(projectRoot);
  const issue = await new WorkService(store).createIssue({
    name: "Start command",
    description: "Verify command lifecycle wiring.",
    scope: { include: ["src/commands/start.ts"], exclude: [] },
  });
  return { issue, projectRoot, store };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("start command", () => {
  it("starts work from a nested project directory", async () => {
    const { issue, projectRoot, store } = await createFixture();
    const nested = path.join(projectRoot, "packages", "app");
    await mkdir(nested, { recursive: true });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runStartCommand({
        args: ["issue", issue.entity.id],
        output,
        startDirectory: nested,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Started issue issue\.start-command in session\.[a-f0-9-]+\.$/,
      ),
    );
    await expect(store.read()).resolves.toMatchObject({
      state: {
        revision: 2,
        data: {
          issues: [{ id: issue.entity.id, status: "active" }],
          activeWork: { kind: "issue", id: issue.entity.id },
        },
      },
    });
    await expect(
      createSessionStateStore(projectRoot).read(),
    ).resolves.toMatchObject({
      state: {
        revision: 1,
        data: {
          current: {
            status: "active",
            activeWork: { kind: "issue", id: issue.entity.id },
          },
        },
      },
    });
    const doctrineSession =
      await createDoctrineSessionStore(projectRoot).read();
    expect(doctrineSession.state).toMatchObject({
      revision: 1,
      data: {
        current: { workKind: "issue", workId: issue.entity.id },
      },
    });
    expect(doctrineSession.state.data.current?.selections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ doctrineId: "doctrine.router" }),
      ]),
    );
  });

  it.each([
    { args: [] },
    { args: ["feature", "feature.invalid"] },
    { args: ["task"] },
    { args: ["task", "task.id", "extra"] },
  ])("rejects invalid arguments: $args", async ({ args }) => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runStartCommand({
        args,
        output,
        startDirectory: process.cwd(),
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      "Usage: autoforge start <task|issue> <id>",
    );
  });
});
