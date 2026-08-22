import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runChangelogCommand } from "../src/commands/changelog.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { createDecisionStore } from "../src/decisions/store.js";
import { DecisionService } from "../src/decisions/service.js";
import { createWorkStateStore } from "../src/state/kernel.js";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createFixture() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-changelog-"),
  );
  temporaryDirectories.push(projectRoot);
  await execFileAsync("git", ["init", "-q"], { cwd: projectRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: projectRoot,
  });
  await execFileAsync("git", ["config", "user.name", "Test"], {
    cwd: projectRoot,
  });
  await initializeProject({ projectRoot });
  await writeFile(
    path.join(projectRoot, "CHANGELOG.md"),
    [
      "# Changelog",
      "",
      "<!-- autoforge:changelog:start -->",
      "<!-- autoforge:changelog:end -->",
      "",
    ].join("\n"),
  );
  await execFileAsync("git", ["add", "-A"], { cwd: projectRoot });
  await execFileAsync("git", ["commit", "-q", "-m", "initial", "--no-verify"], {
    cwd: projectRoot,
  });
  await execFileAsync("git", ["tag", "v0.1.0"], { cwd: projectRoot });
  return { projectRoot };
}

describe("changelog compile command", () => {
  it("writes qualifying decisions since the latest tag into CHANGELOG.md", async () => {
    const { projectRoot } = await createFixture();
    const workStore = createWorkStateStore(projectRoot);
    await new DecisionService(
      createDecisionStore(projectRoot),
      workStore,
    ).record({
      statement: "Fixed a null pointer in checkout.",
      reasoning: "Empty cart crashed the total calculation.",
      consequences: ["Guarded the calculation."],
      scope: ["checkout"],
      keywords: ["bugfix"],
      relatedWork: [],
      kind: "bugfix",
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runChangelogCommand({
        args: ["compile"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const changelog = await readFile(
      path.join(projectRoot, "CHANGELOG.md"),
      "utf8",
    );
    expect(changelog).toContain("Fixed a null pointer in checkout.");
    expect(changelog).toContain("### Fixed");
  });

  it("produces no diff when no qualifying decisions exist since the tag", async () => {
    const { projectRoot } = await createFixture();
    const before = await readFile(
      path.join(projectRoot, "CHANGELOG.md"),
      "utf8",
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runChangelogCommand({
        args: ["compile"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);

    const after = await readFile(
      path.join(projectRoot, "CHANGELOG.md"),
      "utf8",
    );
    expect(after).toBe(before);
  });

  it("rejects unknown subcommands", async () => {
    const { projectRoot } = await createFixture();
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runChangelogCommand({
        args: ["bogus"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });

  it("reports invalidState when no CHANGELOG.md exists", async () => {
    const { projectRoot } = await createFixture();
    await rm(path.join(projectRoot, "CHANGELOG.md"));
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runChangelogCommand({
        args: ["compile"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.invalidState);
    expect(output.stderr).toHaveBeenCalledWith(
      "No CHANGELOG.md found in this project.",
    );
  });
});
