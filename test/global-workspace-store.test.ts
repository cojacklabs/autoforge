import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { GlobalWorkspaceStore } from "../src/workspace/global-store.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("global workspace store", () => {
  it("registers projects in a user-scoped config", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-global-workspace-"),
    );
    directories.push(home);
    const store = new GlobalWorkspaceStore(home);
    await store.registerProject("/tmp/project-b");
    await expect(
      store.registerProject("/tmp/project-a"),
    ).resolves.toMatchObject({
      version: "0.11.0",
      projects: [
        path.resolve("/tmp/project-a"),
        path.resolve("/tmp/project-b"),
      ],
      projectMetadata: {
        [path.resolve("/tmp/project-a")]: {
          name: "project-a",
          lastSeen: expect.any(String),
        },
      },
    });
    for (const directory of ["templates", "doctrines", "cache", "logs"]) {
      await expect(
        access(path.join(home, ".autoforge", directory)),
      ).resolves.toBeUndefined();
    }
  });

  it("registers a new project with an explicit active lifecycle", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-global-workspace-"),
    );
    directories.push(home);
    const store = new GlobalWorkspaceStore(home);
    await store.registerProject("/tmp/project-lifecycle-check");
    const config = await store.read();
    expect(
      config.projectMetadata?.[path.resolve("/tmp/project-lifecycle-check")]
        ?.lifecycle,
    ).toBe("active");
  });

  it("resolves stable global asset directories", async () => {
    const home = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-global-workspace-"),
    );
    directories.push(home);
    const store = new GlobalWorkspaceStore(home);

    expect(store.assetDirectory("templates")).toBe(
      path.join(home, ".autoforge", "templates"),
    );
    expect(store.assetDirectory("doctrines")).toBe(
      path.join(home, ".autoforge", "doctrines"),
    );
  });
});
