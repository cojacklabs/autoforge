import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initializeProject } from "../src/commands/init.js";
import { SpecificationFileStore } from "../src/specifications/store.js";
import type { Specification } from "../src/specifications/schemas.js";

const TIMESTAMP = "2026-08-20T12:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function createProject(): Promise<string> {
  const projectRoot = await createDirectory("autoforge-spec-store-");
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return projectRoot;
}

function specification(id: string, type: Specification["type"]): Specification {
  return {
    id,
    type,
    name: id,
    description: `Description for ${id}.`,
    relationships: {},
    tags: [type],
    source: "project",
    updatedAt: TIMESTAMP,
    content: `# ${id}`,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("specification file store", () => {
  it("atomically registers, reads, and lists specifications", async () => {
    const projectRoot = await createProject();
    const store = new SpecificationFileStore(projectRoot, {
      temporaryId: () => "test",
    });

    await expect(
      store.create(specification("screen.dashboard", "screen")),
    ).resolves.toBe(".autoforge/specifications/screen/dashboard.md");
    await store.create(specification("architecture.system", "architecture"));
    await expect(store.read("screen.dashboard")).resolves.toMatchObject({
      id: "screen.dashboard",
      content: "# screen.dashboard",
    });
    await expect(store.list()).resolves.toMatchObject([
      { id: "architecture.system" },
      { id: "screen.dashboard" },
    ]);
    await expect(
      readFile(
        path.join(projectRoot, ".autoforge/specifications/screen/dashboard.md"),
        "utf8",
      ),
    ).resolves.toContain("id: screen.dashboard");
  });

  it("rejects duplicate registration without replacing content", async () => {
    const projectRoot = await createProject();
    const store = new SpecificationFileStore(projectRoot, {
      temporaryId: () => "test",
    });
    await store.create(specification("component.card", "component"));

    await expect(
      store.create({
        ...specification("component.card", "component"),
        content: "# Replacement",
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
    await expect(store.read("component.card")).resolves.toMatchObject({
      content: "# component.card",
    });
  });

  it("rejects unknown and path-mismatched specifications", async () => {
    const projectRoot = await createProject();
    const store = new SpecificationFileStore(projectRoot);
    await expect(store.read("design.missing")).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    const filePath = path.join(
      projectRoot,
      ".autoforge/specifications/design/wrong.md",
    );
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      `---\nid: design.actual\ntype: design\nname: Actual\ndescription: Mismatched path.\nrelationships: {}\ntags: []\nsource: project\nupdatedAt: ${TIMESTAMP}\n---\n\n# Actual\n`,
    );

    await expect(store.read("design.wrong")).rejects.toMatchObject({
      code: "INVALID_STATE",
      details: {
        expectedId: "design.wrong",
        actualId: "design.actual",
      },
    });
  });

  it("requires initialization and rejects symlink escapes", async () => {
    const uninitialized = await createDirectory(
      "autoforge-spec-uninitialized-",
    );
    await expect(
      new SpecificationFileStore(uninitialized).list(),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    const projectRoot = await createProject();
    const externalRoot = await createDirectory("autoforge-spec-external-");
    await symlink(
      externalRoot,
      path.join(projectRoot, ".autoforge/specifications"),
      "dir",
    );
    await expect(
      new SpecificationFileStore(projectRoot).create(
        specification("flow.checkout", "flow"),
      ),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });
});
