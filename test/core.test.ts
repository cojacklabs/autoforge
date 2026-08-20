import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AutoForgeError,
  EXIT_CODE,
  ProjectNotFoundError,
  toAutoForgeError,
} from "../src/core/errors.js";
import { createLogger } from "../src/core/logger.js";
import { discoverProjectRoot } from "../src/core/project.js";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-core-"));
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

describe("core errors", () => {
  it("preserves stable error metadata", () => {
    const error = new AutoForgeError("INVALID_ARGUMENT", "Invalid value", {
      details: { argument: "value" },
      exitCode: EXIT_CODE.usage,
    });

    expect(error.code).toBe("INVALID_ARGUMENT");
    expect(error.exitCode).toBe(EXIT_CODE.usage);
    expect(error.details).toEqual({ argument: "value" });
  });

  it("normalizes unknown errors", () => {
    const cause = new Error("failure");
    const error = toAutoForgeError(cause);

    expect(error.code).toBe("UNEXPECTED_ERROR");
    expect(error.message).toBe("failure");
    expect(error.cause).toBe(cause);
  });
});

describe("logger", () => {
  it("routes messages by severity and respects the configured level", () => {
    const stdout = vi.fn();
    const stderr = vi.fn();
    const logger = createLogger({
      level: "warn",
      writer: { stdout, stderr },
    });

    logger.info("hidden");
    logger.warn("warning", { project: "demo" });
    logger.error("failure");

    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenNthCalledWith(1, 'warning {"project":"demo"}');
    expect(stderr).toHaveBeenNthCalledWith(2, "failure");
  });
});

describe("project discovery", () => {
  it("prefers an initialized AutoForge project", async () => {
    const root = await createTemporaryDirectory();
    const nested = path.join(root, "packages", "app", "src");
    await mkdir(path.join(root, ".autoforge"));
    await mkdir(path.join(root, ".git"));
    await mkdir(nested, { recursive: true });

    await expect(
      discoverProjectRoot({ startDirectory: nested }),
    ).resolves.toEqual({ path: root, marker: "autoforge" });
  });

  it("prefers a Git root over a nested package fallback", async () => {
    const root = await createTemporaryDirectory();
    const packageRoot = path.join(root, "packages", "app");
    const sourceFile = path.join(packageRoot, "src", "index.ts");
    await mkdir(path.join(root, ".git"));
    await mkdir(path.dirname(sourceFile), { recursive: true });
    await writeFile(path.join(packageRoot, "package.json"), "{}\n");
    await writeFile(sourceFile, "export {};\n");

    await expect(
      discoverProjectRoot({ startDirectory: sourceFile }),
    ).resolves.toEqual({ path: root, marker: "git" });
  });

  it("uses the nearest package root when no stronger marker exists", async () => {
    const root = await createTemporaryDirectory();
    const nested = path.join(root, "src", "core");
    await writeFile(path.join(root, "package.json"), "{}\n");
    await mkdir(nested, { recursive: true });

    await expect(
      discoverProjectRoot({ startDirectory: nested }),
    ).resolves.toEqual({ path: root, marker: "package" });
  });

  it("reports a typed error when no project marker exists", async () => {
    const root = await createTemporaryDirectory();

    await expect(
      discoverProjectRoot({ startDirectory: root }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
