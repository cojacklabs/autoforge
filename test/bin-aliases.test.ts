import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const version = (
  JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    version: string;
  }
).version;

function run(binary: string) {
  return spawnSync(
    process.execPath,
    [path.join(root, "bin", binary), "version"],
    {
      encoding: "utf8",
    },
  );
}

describe("command line entry points", () => {
  it("declares priozar first and keeps autoforge as an alias", () => {
    const { bin } = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    ) as { bin: Record<string, string> };
    expect(Object.keys(bin)).toEqual(["priozar", "autoforge"]);
    expect(bin).toEqual({
      priozar: "bin/priozar.js",
      autoforge: "bin/autoforge.js",
    });
  });

  it("prints the version through the priozar command", () => {
    const result = run("priozar.js");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(`Priozar ${version}`);
  });

  it("prints the same output through the deprecated autoforge alias", () => {
    const result = run("autoforge.js");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(`Priozar ${version}`);
    // Not a terminal, so scripts and CI see no deprecation notice.
    expect(result.stderr).toBe("");
  });
});
