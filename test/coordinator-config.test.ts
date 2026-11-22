import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

interface CoordinatorLike {
  runConfiguredTests(): Promise<boolean>;
  autoforgeDir: string;
}
type CoordinatorConstructor = new (options: {
  repoRoot: string;
}) => CoordinatorLike;

const modulePath = path.resolve(
  import.meta.dirname,
  "..",
  "ai",
  "runtime",
  "coordinator.js",
);
const directories: string[] = [];

async function createCoordinator(
  setup: (repoRoot: string) => void,
): Promise<CoordinatorLike> {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "coordinator-config-"));
  directories.push(repoRoot);
  setup(repoRoot);
  const { Coordinator } = (await import(pathToFileURL(modulePath).href)) as {
    Coordinator: CoordinatorConstructor;
  };
  return new Coordinator({ repoRoot });
}

function writeConfig(repoRoot: string, name: string, exitCode: number): void {
  writeFileSync(
    path.join(repoRoot, name),
    JSON.stringify({
      qualityPolicies: { tests: { cmd: `exit ${exitCode}` } },
    }),
  );
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("ai runtime coordinator configured tests", () => {
  it("runs the test command from priozar.config.json", async () => {
    const coordinator = await createCoordinator((root) =>
      writeConfig(root, "priozar.config.json", 3),
    );
    await expect(coordinator.runConfiguredTests()).resolves.toBe(false);
  });

  it("still runs the test command from the legacy autoforge.config.json", async () => {
    const coordinator = await createCoordinator((root) =>
      writeConfig(root, "autoforge.config.json", 3),
    );
    await expect(coordinator.runConfiguredTests()).resolves.toBe(false);
  });

  it("prefers priozar.config.json when both files exist", async () => {
    const coordinator = await createCoordinator((root) => {
      writeConfig(root, "priozar.config.json", 0);
      writeConfig(root, "autoforge.config.json", 3);
    });
    await expect(coordinator.runConfiguredTests()).resolves.toBe(true);
  });

  it("treats a project with no config file as passing", async () => {
    const coordinator = await createCoordinator(() => undefined);
    await expect(coordinator.runConfiguredTests()).resolves.toBe(true);
  });

  it("uses the .priozar directory when it exists", async () => {
    const coordinator = await createCoordinator((root) =>
      mkdirSync(path.join(root, ".priozar")),
    );
    expect(path.basename(coordinator.autoforgeDir)).toBe(".priozar");
  });
});
