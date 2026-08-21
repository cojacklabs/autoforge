import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { initializeProject } from "../src/commands/init.js";
import {
  inspectBootstrap,
  scaffoldBootstrapManifest,
} from "../src/bootstrap/inspect.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("bootstrap inspection", () => {
  it("reports project markers and installation state", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await initializeProject({ projectRoot: project });

    await expect(inspectBootstrap(project)).resolves.toMatchObject({
      projectRoot: project,
      marker: "autoforge",
      installation: "current",
      nextAction: "ready",
      projectTypes: [],
    });
  });

  it("detects non-Node solution manifests", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await writeFile(path.join(project, "Example.sln"), "");

    await expect(inspectBootstrap(project)).resolves.toMatchObject({
      marker: "git",
      manifests: ["*.sln"],
    });
  });

  it("supports an empty directory for new-project bootstrapping", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-"),
    );
    directories.push(project);

    await expect(inspectBootstrap(project)).resolves.toMatchObject({
      projectRoot: project,
      marker: "none",
      installation: "absent",
      nextAction: "initialize",
      manifests: [],
    });
  });

  it("identifies a legacy AutoForge installation", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".autoforge"));

    await expect(inspectBootstrap(project)).resolves.toMatchObject({
      marker: "autoforge",
      installation: "legacy",
      nextAction: "migrate",
    });
  });

  it("scaffolds a non-destructive bootstrap manifest", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    const manifestPath = await scaffoldBootstrapManifest(project);

    expect(manifestPath).toBe(
      path.join(project, ".autoforge", "bootstrap", "manifest.json"),
    );
    await expect(scaffoldBootstrapManifest(project)).rejects.toMatchObject({
      code: "EEXIST",
    });
  });
});
