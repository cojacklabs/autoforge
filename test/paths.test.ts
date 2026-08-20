import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AutoForgeError } from "../src/core/errors.js";
import {
  isPathContained,
  normalizeProjectRelativePath,
  resolveContainedProjectPath,
  resolveProjectPath,
} from "../src/core/paths.js";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("project-relative path normalization", () => {
  it("normalizes separators and dot segments", () => {
    expect(normalizeProjectRelativePath("src\\core/./paths.ts")).toBe(
      "src/core/paths.ts",
    );
  });

  it.each([
    "../outside.ts",
    "src/../../outside.ts",
    "/tmp/outside.ts",
    "C:\\outside.ts",
    "C:/outside.ts",
    "\\\\server\\share\\outside.ts",
    "",
    "src/paths.ts\0outside",
  ])("rejects unsafe path %s", (candidatePath) => {
    expect(() => normalizeProjectRelativePath(candidatePath)).toThrow(
      AutoForgeError,
    );
  });
});

describe("lexical containment", () => {
  it("resolves a normalized path inside the project", () => {
    const projectRoot = path.resolve("project");

    expect(resolveProjectPath(projectRoot, "src/../test/example.ts")).toBe(
      path.join(projectRoot, "test", "example.ts"),
    );
  });

  it("does not confuse a sibling with a shared path prefix", () => {
    const projectRoot = path.resolve("project");
    const sibling = path.resolve("project-copy", "file.ts");

    expect(isPathContained(projectRoot, sibling)).toBe(false);
  });
});

describe("canonical project containment", () => {
  it("accepts an absolute path inside the project", async () => {
    const projectRoot = await createTemporaryDirectory("autoforge-paths-");
    const sourceDirectory = path.join(projectRoot, "src");
    await mkdir(sourceDirectory);
    const canonicalSourceDirectory = await realpath(sourceDirectory);

    await expect(
      resolveContainedProjectPath(
        projectRoot,
        path.join(sourceDirectory, "future.ts"),
      ),
    ).resolves.toEqual({
      absolutePath: path.join(sourceDirectory, "future.ts"),
      canonicalPath: path.join(canonicalSourceDirectory, "future.ts"),
      relativePath: "src/future.ts",
    });
  });

  it("rejects an absolute path outside the project", async () => {
    const projectRoot = await createTemporaryDirectory("autoforge-paths-");
    const outsideRoot = await createTemporaryDirectory("autoforge-outside-");

    await expect(
      resolveContainedProjectPath(
        projectRoot,
        path.join(outsideRoot, "file.ts"),
      ),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  });

  it("rejects a symlink that escapes the project", async () => {
    const projectRoot = await createTemporaryDirectory("autoforge-paths-");
    const outsideRoot = await createTemporaryDirectory("autoforge-outside-");
    const linkedDirectory = path.join(projectRoot, "linked");
    await symlink(outsideRoot, linkedDirectory, "dir");
    const canonicalOutsideRoot = await realpath(outsideRoot);

    await expect(
      resolveContainedProjectPath(projectRoot, "linked/future.ts"),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
      details: {
        path: "linked/future.ts",
        projectRoot,
        canonicalPath: path.join(canonicalOutsideRoot, "future.ts"),
      },
    });
  });

  it("accepts a symlink whose target remains inside the project", async () => {
    const projectRoot = await createTemporaryDirectory("autoforge-paths-");
    const targetDirectory = path.join(projectRoot, "packages", "shared");
    const linkedDirectory = path.join(projectRoot, "shared");
    await mkdir(targetDirectory, { recursive: true });
    await symlink(targetDirectory, linkedDirectory, "dir");
    const canonicalTargetDirectory = await realpath(targetDirectory);

    await expect(
      resolveContainedProjectPath(projectRoot, "shared/future.ts"),
    ).resolves.toEqual({
      absolutePath: path.join(linkedDirectory, "future.ts"),
      canonicalPath: path.join(canonicalTargetDirectory, "future.ts"),
      relativePath: "packages/shared/future.ts",
    });
  });
});
