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

import {
  initializeProject,
  inspectInstallation,
  runInitCommand,
} from "../src/commands/init.js";
import { parseConfig } from "../src/core/config.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { decisionMemoryEnvelopeSchema } from "../src/decisions/store.js";
import { doctrineRegistryEnvelopeSchema } from "../src/doctrine/store.js";
import {
  sessionStateEnvelopeSchema,
  workStateEnvelopeSchema,
} from "../src/state/kernel.js";
import { parseProjectMetadataEnvelope } from "../src/state/schemas.js";

const PROJECT_ID = "f45b8e3d-e9d8-465b-8489-3bc5e5e5a4dd";
const TIMESTAMP = "2026-08-19T23:00:00.000Z";
const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "autoforge-init-"));
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, ".git"));
  return directory;
}

async function initializeFixture(projectRoot: string) {
  return initializeProject({
    projectRoot,
    projectId: PROJECT_ID,
    now: () => new Date(TIMESTAMP),
    temporaryId: () => "test",
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("project initialization", () => {
  it("publishes only the minimal validated AutoForge tree", async () => {
    const projectRoot = await createProject();

    await expect(initializeFixture(projectRoot)).resolves.toMatchObject({
      status: "current",
      directory: path.join(projectRoot, ".autoforge"),
    });

    expect(
      (await readdir(path.join(projectRoot, ".autoforge"))).sort(),
    ).toEqual(["config.json", "state"]);
    expect(
      (await readdir(path.join(projectRoot, ".autoforge", "state"))).sort(),
    ).toEqual([
      "decisions.json",
      "doctrine-session.json",
      "doctrines.json",
      "metadata.json",
      "session.json",
      "work.json",
    ]);

    const config = parseConfig(
      JSON.parse(
        await readFile(
          path.join(projectRoot, ".autoforge", "config.json"),
          "utf8",
        ),
      ),
    );
    const metadata = parseProjectMetadataEnvelope(
      JSON.parse(
        await readFile(
          path.join(projectRoot, ".autoforge", "state", "metadata.json"),
          "utf8",
        ),
      ),
    );
    expect(config.projectId).toBe(PROJECT_ID);
    expect(metadata).toMatchObject({
      revision: 0,
      updatedAt: TIMESTAMP,
      data: { projectId: PROJECT_ID, initializedAt: TIMESTAMP },
    });
    expect(
      workStateEnvelopeSchema.parse(
        JSON.parse(
          await readFile(
            path.join(projectRoot, ".autoforge", "state", "work.json"),
            "utf8",
          ),
        ),
      ),
    ).toMatchObject({
      revision: 0,
      updatedAt: TIMESTAMP,
      data: {
        features: [],
        phases: [],
        tasks: [],
        issues: [],
        activeWork: null,
      },
    });
    expect(
      sessionStateEnvelopeSchema.parse(
        JSON.parse(
          await readFile(
            path.join(projectRoot, ".autoforge", "state", "session.json"),
            "utf8",
          ),
        ),
      ),
    ).toMatchObject({
      revision: 0,
      updatedAt: TIMESTAMP,
      data: { current: null, previous: [] },
    });
    expect(
      decisionMemoryEnvelopeSchema.parse(
        JSON.parse(
          await readFile(
            path.join(projectRoot, ".autoforge", "state", "decisions.json"),
            "utf8",
          ),
        ),
      ),
    ).toMatchObject({
      revision: 0,
      updatedAt: TIMESTAMP,
      data: { decisions: [] },
    });
    const doctrines = doctrineRegistryEnvelopeSchema.parse(
      JSON.parse(
        await readFile(
          path.join(projectRoot, ".autoforge", "state", "doctrines.json"),
          "utf8",
        ),
      ),
    );
    expect(doctrines).toMatchObject({
      revision: 0,
      updatedAt: TIMESTAMP,
    });
    expect(doctrines.data.doctrines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "doctrine.router" }),
      ]),
    );
  });

  it("refuses repeated initialization without changing files", async () => {
    const projectRoot = await createProject();
    await initializeFixture(projectRoot);
    const configPath = path.join(projectRoot, ".autoforge", "config.json");
    const originalConfig = await readFile(configPath, "utf8");

    await expect(initializeFixture(projectRoot)).rejects.toMatchObject({
      code: "STATE_CONFLICT",
      details: { status: "current" },
    });
    expect(await readFile(configPath, "utf8")).toBe(originalConfig);
  });

  it("detects and preserves a legacy installation", async () => {
    const projectRoot = await createProject();
    const legacyFile = path.join(projectRoot, ".autoforge", "ai", "README.md");
    await mkdir(path.dirname(legacyFile), { recursive: true });
    await writeFile(legacyFile, "legacy\n");

    await expect(inspectInstallation(projectRoot)).resolves.toMatchObject({
      status: "legacy",
    });
    await expect(initializeFixture(projectRoot)).rejects.toMatchObject({
      code: "STATE_CONFLICT",
      details: { status: "legacy" },
    });
    expect(await readFile(legacyFile, "utf8")).toBe("legacy\n");
    expect(await readdir(path.join(projectRoot, ".autoforge"))).toEqual(["ai"]);
  });

  it("refuses a partial installation", async () => {
    const projectRoot = await createProject();
    const autoforgeDirectory = path.join(projectRoot, ".autoforge");
    await mkdir(autoforgeDirectory);
    await writeFile(path.join(autoforgeDirectory, "config.json"), "{}\n");

    await expect(initializeFixture(projectRoot)).rejects.toMatchObject({
      code: "INVALID_STATE",
      details: { status: "partial" },
    });
    expect(await readdir(autoforgeDirectory)).toEqual(["config.json"]);
  });
});

describe("init command", () => {
  it("discovers the project from a nested directory", async () => {
    const projectRoot = await createProject();
    const nestedDirectory = path.join(projectRoot, "packages", "app", "src");
    await mkdir(nestedDirectory, { recursive: true });
    const output = {
      stdout: vi.fn(),
      stderr: vi.fn(),
    };

    await expect(
      runInitCommand({
        args: [],
        output,
        startDirectory: nestedDirectory,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      `Initialized AutoForge in ${path.join(projectRoot, ".autoforge")}`,
    );
    await expect(inspectInstallation(projectRoot)).resolves.toMatchObject({
      status: "current",
    });
  });

  it("rejects command arguments without writing", async () => {
    const projectRoot = await createProject();
    const output = {
      stdout: vi.fn(),
      stderr: vi.fn(),
    };

    await expect(
      runInitCommand({
        args: ["--force"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    expect(output.stderr).toHaveBeenCalledWith(
      'Command "init" does not accept arguments.',
    );
    await expect(inspectInstallation(projectRoot)).resolves.toMatchObject({
      status: "absent",
    });
  });
});
