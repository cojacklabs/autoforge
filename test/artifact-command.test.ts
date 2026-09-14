import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runArtifactCommand } from "../src/commands/artifact.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";

const directories: string[] = [];
afterEach(async () =>
  Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  ),
);

describe("artifact command", () => {
  it("imports an existing document by reference without moving it", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-artifact-import-"),
    );
    directories.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    await mkdir(path.join(root, "docs"));
    await writeFile(path.join(root, "docs", "plan.md"), "# Existing plan\n");
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runArtifactCommand({
        args: [
          "import",
          "docs/plan.md",
          "--id",
          "artifact.existing-plan",
          "--kind",
          "plan",
          "--title",
          "Existing plan",
          "--agent",
          "claude",
          "--work",
          "issue.artifacts",
        ],
        output,
        startDirectory: root,
        computeRevision: async () => ({
          sha: "abc123",
          dirty: true,
          worktreeFingerprint: "a".repeat(64),
        }),
      }),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      readFile(path.join(root, "docs", "plan.md"), "utf8"),
    ).resolves.toBe("# Existing plan\n");
    const registry = JSON.parse(
      await readFile(
        path.join(root, ".autoforge", "artifacts", "registry.json"),
        "utf8",
      ),
    );
    expect(registry.artifacts[0]).toMatchObject({
      id: "artifact.existing-plan",
      content: { type: "reference", path: "docs/plan.md" },
      sourceRevision: { gitHead: "abc123", dirtyFingerprint: "a".repeat(64) },
    });
  });

  it("registers, lists, shows, approves, and supersedes artifacts", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-artifact-command-"),
    );
    directories.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const base = {
      kind: "plan",
      title: "Plan",
      agentId: "codex",
      workId: "issue.artifacts",
      sourceRevision: { gitHead: "abc123", dirtyFingerprint: null },
      content: { type: "inline", mediaType: "text/markdown", value: "# Plan" },
    };
    await writeFile(
      path.join(root, "v1.json"),
      JSON.stringify({ ...base, id: "artifact.plan-v1" }),
    );
    await writeFile(
      path.join(root, "v2.json"),
      JSON.stringify({
        ...base,
        id: "artifact.plan-v2",
        title: "Revised plan",
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    const run = (args: string[]) =>
      runArtifactCommand({ args, output, startDirectory: root });
    await expect(run(["register", "v1.json"])).resolves.toBe(EXIT_CODE.success);
    await expect(
      run(["approve", "artifact.plan-v1", "--by", "maintainer"]),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(
      run(["supersede", "artifact.plan-v1", "v2.json"]),
    ).resolves.toBe(EXIT_CODE.success);
    await expect(run(["list"])).resolves.toBe(EXIT_CODE.success);
    expect(
      JSON.parse(output.stdout.mock.calls.at(-1)?.[0] ?? "[]"),
    ).toHaveLength(2);
    await expect(run(["show", "artifact.plan-v2"])).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(
      JSON.parse(output.stdout.mock.calls.at(-1)?.[0] ?? "{}"),
    ).toMatchObject({ supersedes: "artifact.plan-v1", status: "draft" });
  });
});
