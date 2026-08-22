import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runProjectsCommand } from "../src/commands/projects.js";
import { GlobalWorkspaceStore } from "../src/workspace/global-store.js";

const roots: string[] = [];

afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("projects command", () => {
  it("shows registered project metadata as JSON", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "project");
    await new GlobalWorkspaceStore(home).registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["show", project, "--json"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"name": "project"'),
    );
  });

  it("lists projects as JSON", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "project");
    await new GlobalWorkspaceStore(home).registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["list", "--json"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"path":'),
    );
  });
});
