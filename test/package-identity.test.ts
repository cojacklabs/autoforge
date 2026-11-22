import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { findPackageVersion } from "../src/cli/index.js";
import { FRAMEWORK_IDENTITY } from "../src/core/vocabularies.js";

const root = path.resolve(import.meta.dirname, "..");
const readName = (relative: string): string =>
  (
    JSON.parse(readFileSync(path.join(root, relative), "utf8")) as {
      name: string;
    }
  ).name;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("package names match the successor identity", () => {
  it("names the published packages after FRAMEWORK_IDENTITY.successor", () => {
    const { successor } = FRAMEWORK_IDENTITY;
    expect(readName("package.json")).toBe(successor.cliPackage);
    expect(readName("packages/core/package.json")).toBe(successor.corePackage);
    expect(readName("packages/protocol/package.json")).toBe(
      successor.protocolPackage,
    );
    expect(readName("packages/sdk/package.json")).toBe(successor.sdkPackage);
  });

  it("names the remaining workspace packages with the same scope and stem", () => {
    expect(readName("packages/providers/package.json")).toBe(
      "@cojacklabs/priozar-providers",
    );
    expect(readName("apps/agent-cli/package.json")).toBe(
      "@cojacklabs/priozar-agent",
    );
  });
});

describe("package metadata lookup", () => {
  async function versionFor(packageName: string): Promise<string> {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "package-identity-"),
    );
    temporaryDirectories.push(directory);
    await mkdir(path.join(directory, "dist"));
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ name: packageName, version: "9.9.9" }),
    );
    return findPackageVersion(
      pathToFileURL(path.join(directory, "dist", "cli.js")).href,
    );
  }

  it("reads the version from the renamed package", async () => {
    await expect(versionFor("@cojacklabs/priozar")).resolves.toBe("9.9.9");
  });

  it("still reads the version from a pre-rename install", async () => {
    await expect(versionFor("@cojacklabs/autoforge")).resolves.toBe("9.9.9");
  });
});
