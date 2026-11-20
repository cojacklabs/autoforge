import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolveContainedProjectPath,
  resolveProjectPath,
} from "../src/core/paths.js";
import { discoverProjectRoot } from "../src/core/project.js";
import { evaluateGuardrails } from "../src/guardrails/policy.js";
import {
  resolveStateDirectoryName,
  resolveStateDirectoryPath,
} from "../src/core/state-directory.js";
import { createWorkStateStore } from "../src/state/kernel.js";
import { inspectProjectInventory } from "../src/workspace/inventory.js";
import { inspectProjectStorage } from "../src/workspace/storage.js";

const temporaryDirectories: string[] = [];

async function createProject(...stateDirectories: string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "state-directory-"));
  temporaryDirectories.push(root);
  for (const directory of stateDirectories) {
    await mkdir(path.join(root, directory, "state"), { recursive: true });
    await writeFile(path.join(root, directory, "state", "marker.txt"), "x");
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("state directory resolution", () => {
  it("uses .autoforge when only the legacy directory exists", async () => {
    const root = await createProject(".autoforge");
    expect(resolveStateDirectoryName(root)).toBe(".autoforge");
    expect(resolveStateDirectoryPath(root)).toBe(path.join(root, ".autoforge"));
  });

  it("uses .priozar when only the new directory exists", async () => {
    const root = await createProject(".priozar");
    expect(resolveStateDirectoryName(root)).toBe(".priozar");
  });

  it("prefers .priozar when both directories exist", async () => {
    const root = await createProject(".autoforge", ".priozar");
    expect(resolveStateDirectoryName(root)).toBe(".priozar");
  });

  it("falls back to the legacy name when neither exists", async () => {
    const root = await createProject();
    expect(resolveStateDirectoryName(root)).toBe(".autoforge");
  });
});

describe("state directory consumers", () => {
  it("discovers a project root marked only by .priozar", async () => {
    const root = await createProject(".priozar");
    const nested = path.join(root, "a", "b");
    await mkdir(nested, { recursive: true });
    const found = await discoverProjectRoot({ startDirectory: nested });
    expect(found.path).toBe(root);
    expect(found.marker).toBe("autoforge");
  });

  it("places kernel state under .priozar when it exists", async () => {
    const root = await createProject(".priozar");
    const store = createWorkStateStore(root);
    expect(store.filePath).toBe(
      path.join(root, ".priozar", "state", "work.json"),
    );
  });

  it("keeps kernel state under .autoforge for legacy projects", async () => {
    const root = await createProject(".autoforge");
    const store = createWorkStateStore(root);
    expect(store.filePath).toBe(
      path.join(root, ".autoforge", "state", "work.json"),
    );
  });

  it("inspects storage of whichever state directory is active", async () => {
    const root = await createProject(".priozar");
    const report = await inspectProjectStorage(root);
    expect(report.exists).toBe(true);
    expect(report.files).toBe(1);
  });

  it("counts .priozar files in the project inventory", async () => {
    const root = await createProject(".priozar");
    const inventory = await inspectProjectInventory(root);
    expect(inventory.categories.autoforge).toBe(1);
  });
});

describe("state-relative path mapping", () => {
  it("maps a leading .autoforge/ segment to .priozar when it is active", async () => {
    const root = await createProject(".priozar");
    expect(resolveProjectPath(root, ".autoforge/context/current.md")).toBe(
      path.join(root, ".priozar", "context", "current.md"),
    );
    const resolved = await resolveContainedProjectPath(
      root,
      ".autoforge/quality/evidence.json",
    );
    expect(resolved.relativePath).toBe(".priozar/quality/evidence.json");
  });

  it("leaves .autoforge/ paths alone for legacy projects", async () => {
    const root = await createProject(".autoforge");
    expect(resolveProjectPath(root, ".autoforge/twin/projection.json")).toBe(
      path.join(root, ".autoforge", "twin", "projection.json"),
    );
  });

  it("does not rewrite names that merely start with .autoforge", async () => {
    const root = await createProject(".priozar");
    expect(resolveProjectPath(root, ".autoforge-notes/a.md")).toBe(
      path.join(root, ".autoforge-notes", "a.md"),
    );
    expect(resolveProjectPath(root, "src/.autoforge/a.md")).toBe(
      path.join(root, "src", ".autoforge", "a.md"),
    );
  });

  it("passes explicit .priozar/ paths through unchanged", async () => {
    const root = await createProject(".priozar");
    expect(resolveProjectPath(root, ".priozar/state/work.json")).toBe(
      path.join(root, ".priozar", "state", "work.json"),
    );
  });
});
