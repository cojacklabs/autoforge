import {
  access,
  mkdir,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runProjectsCommand } from "../src/commands/projects.js";
import { GlobalWorkspaceStore } from "../src/workspace/global-store.js";
import {
  projectStorageDirectory,
  StorageManifestStore,
} from "../src/workspace/tiered-storage.js";

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

  it("lists projects as text when no action is given", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "project");
    await new GlobalWorkspaceStore(home).registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: [],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining(project),
    );
  });

  it("rejects a trailing flag on list that is not --json", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["list", "--bogus"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(2);
    expect(output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("Usage:"),
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
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"lifecycle": "active"'),
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

  it("stores a bounded retention policy", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "project");
    const store = new GlobalWorkspaceStore(home);
    await store.registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runProjectsCommand({
        args: ["update", project, "--retention-days", "90"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    await expect(store.read()).resolves.toMatchObject({
      projectMetadata: { [project]: { retentionDays: 90 } },
    });
  });

  it("records a planned relocation without changing the active path", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "current-project");
    const destination = path.join(home, "future-project");
    const store = new GlobalWorkspaceStore(home);
    await store.registerProject(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runProjectsCommand({
        args: ["relocate", project, destination, "--planned"],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    await expect(store.read()).resolves.toMatchObject({
      projects: [project],
      projectMetadata: {
        [project]: {
          relocation: {
            from: project,
            to: destination,
            status: "planned",
            completedAt: null,
          },
        },
      },
    });
  });

  it("relocates registry metadata and path-derived global storage", async () => {
    const home = await mkdtemp(path.join(os.tmpdir(), "autoforge-projects-"));
    roots.push(home);
    const project = path.join(home, "current-project");
    const destination = path.join(home, "moved-project");
    const projectId = "123e4567-e89b-42d3-a456-426614174000";
    await mkdir(path.join(project, ".autoforge"), { recursive: true });
    await writeFile(
      path.join(project, ".autoforge", "config.json"),
      JSON.stringify({ projectId }),
    );
    const store = new GlobalWorkspaceStore(home);
    await store.registerProject(project);
    await new StorageManifestStore(project, home).write(
      new Date("2026-08-22T12:00:00.000Z"),
    );
    await rename(project, destination);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runProjectsCommand({
        args: ["move", project, destination],
        output,
        homeDirectory: home,
      }),
    ).resolves.toBe(0);
    await expect(store.read()).resolves.toMatchObject({
      projects: [destination],
      projectMetadata: {
        [destination]: {
          projectId,
          previousPaths: [project],
          relocation: { status: "completed" },
        },
      },
    });
    await expect(
      new StorageManifestStore(destination, home).read(),
    ).resolves.toMatchObject({ canonicalPath: destination });
    await expect(
      access(projectStorageDirectory(project, home)),
    ).rejects.toThrow();
  });
});
