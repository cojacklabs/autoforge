import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { GlobalWorkspaceStore } from "../src/workspace/global-store.js";
import { resolveWorkspaceAsset } from "../src/workspace/assets.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("workspace assets", () => {
  it("prefers project assets over global defaults", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-assets-"));
    directories.push(root);
    const project = path.join(root, "project");
    const home = path.join(root, "home");
    await mkdir(path.join(project, ".autoforge", "templates"), {
      recursive: true,
    });
    await mkdir(path.join(home, ".autoforge", "templates"), {
      recursive: true,
    });
    await writeFile(
      path.join(project, ".autoforge", "templates", "default.md"),
      "project",
    );
    await writeFile(
      path.join(home, ".autoforge", "templates", "default.md"),
      "global",
    );
    const resolved = await resolveWorkspaceAsset(
      project,
      "templates",
      "default.md",
      new GlobalWorkspaceStore(home),
    );
    expect(resolved).toBe(
      path.join(project, ".autoforge", "templates", "default.md"),
    );
  });

  it("rejects traversal asset names", async () => {
    await expect(
      resolveWorkspaceAsset("/tmp/project", "templates", "../secret.md"),
    ).resolves.toBeUndefined();
  });
});
