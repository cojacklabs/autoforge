import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { inspectInstallation } from "../src/commands/init.js";
import { runMigrateCommand } from "../src/commands/migrate.js";
import { EXIT_CODE } from "../src/core/errors.js";
import {
  migrateLegacyProject,
  planLegacyMigration,
} from "../src/migrations/legacy.js";

const PROJECT_ID = "f45b8e3d-e9d8-465b-8489-3bc5e5e5a4dd";
const TIMESTAMP = "2026-08-20T15:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-migration-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  return projectRoot;
}

async function createLegacyFixture(projectRoot: string): Promise<void> {
  await mkdir(path.join(projectRoot, ".autoforge", "ai", "prompts"), {
    recursive: true,
  });
  await writeFile(
    path.join(projectRoot, ".autoforge", "package.json"),
    `${JSON.stringify({ name: "@cojacklabs/autoforge", version: "0.6.0" })}\n`,
  );
  await writeFile(
    path.join(projectRoot, ".autoforge", "ai", "prompts", "legacy.yaml"),
    "prompt: legacy\n",
  );
  await writeFile(
    path.join(projectRoot, ".autoforge", "runtime.db"),
    "legacy-state\n",
  );
  await writeFile(
    path.join(projectRoot, "autoforge.config.json"),
    `${JSON.stringify({
      qualityPolicies: {
        typecheck: { cmd: "tsc --noEmit" },
        lint: { cmd: 'eslint --rule "quoted" .' },
        format: { cmdCheck: "npm run format:check" },
        tests: { cmd: "npm test" },
      },
    })}\n`,
  );
  await writeFile(
    path.join(projectRoot, ".gitignore"),
    "node_modules/\n.autoforge/\n",
  );
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("legacy migration planning", () => {
  it("detects the version, safe quality commands, and skipped files", async () => {
    const projectRoot = await createProject();
    await createLegacyFixture(projectRoot);

    const plan = await planLegacyMigration(projectRoot);

    expect(plan.sourceVersion).toBe("0.6.0");
    expect(plan.qualityGates.map(({ id }) => id)).toEqual([
      "typecheck",
      "format",
      "tests",
    ]);
    expect(plan.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "autoforge.config.json#qualityPolicies.lint",
          outcome: "skipped",
        }),
        expect.objectContaining({
          path: ".autoforge/ai/prompts/legacy.yaml",
          outcome: "skipped",
        }),
      ]),
    );
  });

  it("performs a read-only dry run", async () => {
    const projectRoot = await createProject();
    await createLegacyFixture(projectRoot);

    const result = await migrateLegacyProject({
      projectRoot,
      dryRun: true,
    });

    expect(result).toMatchObject({
      status: "planned",
      backupDirectory: null,
      validation: "not-run",
    });
    expect(await inspectInstallation(projectRoot)).toMatchObject({
      status: "legacy",
    });
    expect(await readdir(projectRoot)).not.toContain(
      expect.stringContaining(".autoforge.backup-"),
    );
  });

  it("rejects unversioned and unsupported legacy trees", async () => {
    const projectRoot = await createProject();
    await mkdir(path.join(projectRoot, ".autoforge", "ai"), {
      recursive: true,
    });

    await expect(planLegacyMigration(projectRoot)).rejects.toMatchObject({
      code: "INVALID_STATE",
      message: expect.stringContaining("version could not be detected"),
    });
  });
});

describe("legacy migration execution", () => {
  it("backs up all legacy files, converts safe config, and validates 0.7", async () => {
    const projectRoot = await createProject();
    await createLegacyFixture(projectRoot);

    const result = await migrateLegacyProject({
      projectRoot,
      projectId: PROJECT_ID,
      now: () => new Date(TIMESTAMP),
      temporaryId: () => "migration-test",
    });

    expect(result).toMatchObject({
      status: "migrated",
      sourceVersion: "0.6.0",
      backupDirectory: path.join(
        projectRoot,
        ".autoforge.backup-migration-test",
      ),
      validation: "current",
    });
    expect(await inspectInstallation(projectRoot)).toMatchObject({
      status: "current",
      config: {
        projectId: PROJECT_ID,
        qualityGates: [
          expect.objectContaining({ id: "typecheck", command: "tsc" }),
          expect.objectContaining({ id: "format", command: "npm" }),
          expect.objectContaining({ id: "tests", command: "npm" }),
        ],
      },
    });
    expect(
      await readFile(
        path.join(
          projectRoot,
          ".autoforge.backup-migration-test",
          "ai",
          "prompts",
          "legacy.yaml",
        ),
        "utf8",
      ),
    ).toBe("prompt: legacy\n");
    expect(
      await readFile(
        path.join(
          projectRoot,
          ".autoforge.backup-migration-test",
          "runtime.db",
        ),
        "utf8",
      ),
    ).toBe("legacy-state\n");
    expect(
      await readFile(path.join(projectRoot, "autoforge.config.json"), "utf8"),
    ).toContain("qualityPolicies");
    expect(await readFile(path.join(projectRoot, ".gitignore"), "utf8")).toBe(
      [
        "node_modules/",
        ".autoforge.backup-*/",
        ".autoforge/context/",
        ".autoforge/state/session.json",
        ".autoforge/state/doctrine-session.json",
        ".autoforge/state/*.json.bak",
        "",
      ].join("\n"),
    );
    expect(
      (await readdir(projectRoot)).filter((entry) =>
        entry.startsWith(".gitignore.migrate-"),
      ),
    ).toEqual([]);
  });

  it("fails before publication when the backup destination conflicts", async () => {
    const projectRoot = await createProject();
    await createLegacyFixture(projectRoot);
    await mkdir(path.join(projectRoot, ".autoforge.backup-conflict"));

    await expect(
      migrateLegacyProject({
        projectRoot,
        temporaryId: () => "conflict",
      }),
    ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
    expect(await inspectInstallation(projectRoot)).toMatchObject({
      status: "legacy",
    });
    expect(
      await readFile(
        path.join(projectRoot, ".autoforge", "runtime.db"),
        "utf8",
      ),
    ).toBe("legacy-state\n");
    expect(await readdir(projectRoot)).not.toContain(
      ".autoforge.migrate-conflict",
    );
  });

  it("prints machine-readable migration plans", async () => {
    const projectRoot = await createProject();
    await createLegacyFixture(projectRoot);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runMigrateCommand({
        args: ["--dry-run", "--json"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "")).toMatchObject({
      status: "planned",
      sourceVersion: "0.6.0",
    });
    expect(output.stderr).not.toHaveBeenCalled();
  });
});
