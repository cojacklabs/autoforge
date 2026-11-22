import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const config = {
  codeTargets: { backend: { path: "../api", description: "API code" } },
};
const directories: string[] = [];

function project(stateDir: string, configName?: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "priozar-config-test-"));
  directories.push(dir);
  mkdirSync(path.join(dir, stateDir), { recursive: true });
  if (configName) {
    writeFileSync(path.join(dir, configName), JSON.stringify(config));
  }
  return dir;
}

function applyConfig(dir: string) {
  return spawnSync(
    process.execPath,
    [path.join(root, "scripts", "apply_config.js"), dir],
    { encoding: "utf8" },
  );
}

function targets(dir: string, stateDir: string): string {
  return readFileSync(
    path.join(dir, stateDir, "ai", "code_targets.yaml"),
    "utf8",
  );
}

afterEach(() => {
  for (const dir of directories.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("apply_config project configuration file", () => {
  it("reads priozar.config.json into the .priozar directory", () => {
    const dir = project(".priozar", "priozar.config.json");
    const result = applyConfig(dir);
    expect(result.status, result.stderr).toBe(0);
    const written = targets(dir, ".priozar");
    expect(written).toContain("../api");
    expect(written).toContain("priozar.config.json");
  });

  it("still reads the legacy autoforge.config.json", () => {
    const dir = project(".autoforge", "autoforge.config.json");
    const result = applyConfig(dir);
    expect(result.status, result.stderr).toBe(0);
    expect(targets(dir, ".autoforge")).toContain("../api");
  });

  it("prefers priozar.config.json when both exist", () => {
    const dir = project(".priozar", "priozar.config.json");
    writeFileSync(
      path.join(dir, "autoforge.config.json"),
      JSON.stringify({ codeTargets: { backend: { path: "../legacy" } } }),
    );
    const result = applyConfig(dir);
    expect(result.status, result.stderr).toBe(0);
    const written = targets(dir, ".priozar");
    expect(written).toContain("../api");
    expect(written).not.toContain("../legacy");
  });

  it("explains when no configuration file exists", () => {
    const result = applyConfig(project(".priozar"));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("priozar.config.json");
  });
});
