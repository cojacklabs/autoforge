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

  it("reports project storage as JSON", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "project");
    await new GlobalWorkspaceStore(home).registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["storage", project, "--json"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"exists": false'),
    );
  });

  it("previews inaccessible projects without removing them", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "missing");
    await new GlobalWorkspaceStore(home).registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["prune", "--dry-run"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      "Prune preview: 1 inaccessible project(s).",
    );
  });

  it("archives and restores a registered project", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "project");
    const store = new GlobalWorkspaceStore(home);
    await store.registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["archive", project],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    await expect(
      runProjectsCommand({
        args: ["restore", project],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    await expect(store.read()).resolves.toMatchObject({
      projectMetadata: { [project]: { lifecycle: "active" } },
    });
  });
});
