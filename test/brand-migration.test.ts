import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as init from "../src/commands/init.js";
import {
  inspectInstallation,
  initializeProject,
} from "../src/commands/init.js";
import { FRAMEWORK_IDENTITY } from "../src/core/vocabularies.js";
import { migrateBrand, mirrorGitignoreRules } from "../src/migrations/brand.js";

vi.mock("../src/commands/init.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/commands/init.js")>();
  return { ...actual, inspectInstallation: vi.fn(actual.inspectInstallation) };
});

const SOURCE = FRAMEWORK_IDENTITY.current.stateDirectory;
const TARGET = FRAMEWORK_IDENTITY.successor.stateDirectory;
const GITIGNORE = [
  "node_modules/",
  ".autoforge/context/",
  ".autoforge/state/session.json",
  "!.autoforge/state/keep.json",
  "",
].join("\n");
const temporaryDirectories: string[] = [];

async function createInitializedProject(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "brand-migrate-"));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, ".git"));
  await initializeProject({
    projectRoot: root,
    projectId: "f45b8e3d-e9d8-465b-8489-3bc5e5e5a4dd",
    now: () => new Date("2026-08-19T23:30:00.000Z"),
    temporaryId: () => "brand-test",
  });
  // Untracked runtime state that a naive copy of tracked files would lose.
  await mkdir(path.join(root, SOURCE, "context"), { recursive: true });
  await writeFile(path.join(root, SOURCE, "context", "current.md"), "ctx");
  await writeFile(path.join(root, ".gitignore"), GITIGNORE);
  return root;
}

async function listFiles(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(
        ...(await listFiles(absolute)).map((file) => `${entry.name}/${file}`),
      );
    } else {
      found.push(entry.name);
    }
  }
  return found.sort();
}

async function exists(target: string): Promise<boolean> {
  return stat(target).then(
    () => true,
    () => false,
  );
}

afterEach(async () => {
  vi.mocked(init.inspectInstallation).mockClear();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("recoverable brand migration", () => {
  it("plans the real contents without writing anything", async () => {
    const root = await createInitializedProject();
    const before = await listFiles(root);

    const plan = await migrateBrand({ projectRoot: root, dryRun: true });

    expect(plan).toMatchObject({
      status: "planned",
      sourceDirectory: SOURCE,
      targetDirectory: TARGET,
      backupDirectory: null,
      validation: "not-run",
    });
    expect(plan.artifacts).toEqual(
      expect.arrayContaining([
        { path: `${SOURCE}/config.json`, action: "copied" },
        { path: `${SOURCE}/state`, action: "copied" },
        { path: `${SOURCE}/context`, action: "copied" },
        { path: ".gitignore", action: "migrated" },
        { path: SOURCE, action: "removed" },
      ]),
    );
    expect(await listFiles(root)).toEqual(before);
    expect(await exists(path.join(root, TARGET))).toBe(false);
  });

  it("refuses to migrate an installation that is not current", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "brand-migrate-bad-"));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, SOURCE));
    await writeFile(path.join(root, SOURCE, "config.json"), "{}");

    await expect(
      migrateBrand({ projectRoot: root, dryRun: true }),
    ).rejects.toThrow(/not current/);
    await expect(migrateBrand({ projectRoot: root })).rejects.toThrow(
      /not current/,
    );
    expect(await exists(path.join(root, TARGET))).toBe(false);
  });

  it("detects dual-directory conflicts and stops cleanly", async () => {
    const root = await createInitializedProject();
    await mkdir(path.join(root, TARGET));

    await expect(migrateBrand({ projectRoot: root })).rejects.toThrow(
      /Dual-directory conflict/,
    );
    expect(await exists(path.join(root, SOURCE, "config.json"))).toBe(true);
  });

  it("copies everything, validates, and only then removes the source", async () => {
    const root = await createInitializedProject();
    const sourceFiles = await listFiles(path.join(root, SOURCE));

    const result = await migrateBrand({
      projectRoot: root,
      temporaryId: () => "apply-test",
    });

    expect(result.status).toBe("migrated");
    expect(result.validation).toBe("valid");
    expect(result.backupDirectory).toBe(`${SOURCE}.backup-apply-test`);
    // Every file, including untracked runtime state, reached the new directory
    expect(await listFiles(path.join(root, TARGET))).toEqual(sourceFiles);
    expect(await listFiles(path.join(root, result.backupDirectory!))).toEqual(
      sourceFiles,
    );
    expect(await exists(path.join(root, SOURCE))).toBe(false);
    // The real installation check passes against the new directory
    const inspection = await inspectInstallation(root);
    expect(inspection.status).toBe("current");
    expect(inspection.directory).toBe(path.join(root, TARGET));
    // No lock, staging or temporary files are left behind
    expect(
      (await readdir(root)).filter((name) =>
        /migrate\.lock|staging|\.tmp$/.test(name),
      ),
    ).toEqual([]);
  });

  it("mirrors the gitignore rules so runtime state stays ignored", async () => {
    const root = await createInitializedProject();

    await migrateBrand({ projectRoot: root });

    const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
    expect(gitignore).toContain(".autoforge/context/");
    expect(gitignore).toContain(".priozar/context/");
    expect(gitignore).toContain(".priozar/state/session.json");
    expect(gitignore).toContain("!.priozar/state/keep.json");
    expect(gitignore).toContain(".autoforge.backup-*/");
  });

  it("rolls back and keeps the source when validation fails", async () => {
    const root = await createInitializedProject();
    const sourceFiles = await listFiles(path.join(root, SOURCE));
    const realInspect = (
      await vi.importActual<typeof import("../src/commands/init.js")>(
        "../src/commands/init.js",
      )
    ).inspectInstallation;
    vi.mocked(init.inspectInstallation)
      .mockImplementationOnce(realInspect)
      .mockResolvedValueOnce({ status: "partial", directory: "" });

    await expect(migrateBrand({ projectRoot: root })).rejects.toThrow(
      /failed validation/,
    );

    expect(await listFiles(path.join(root, SOURCE))).toEqual(sourceFiles);
    expect(await exists(path.join(root, TARGET))).toBe(false);
    expect(await readFile(path.join(root, ".gitignore"), "utf8")).toBe(
      GITIGNORE,
    );
    expect(
      (await readdir(root)).filter((name) =>
        /migrate\.lock|staging|\.tmp$/.test(name),
      ),
    ).toEqual([]);
  });
});

describe("mirrorGitignoreRules", () => {
  it("returns undefined when everything is already mirrored", () => {
    const content = [
      ".autoforge/context/",
      ".priozar/context/",
      ".autoforge.backup-*/",
      "",
    ].join("\n");
    expect(mirrorGitignoreRules(content)).toBeUndefined();
  });

  it("leaves unrelated rules untouched", () => {
    const result = mirrorGitignoreRules("node_modules/\n.autoforge/context/\n");
    expect(result).toContain("node_modules/");
    expect(result?.match(/\.priozar\/context\//g)).toHaveLength(1);
  });
});
