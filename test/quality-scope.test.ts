import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  computeCurrentEnvironment,
  computeCurrentRevision,
  computeGateDefinitionFingerprint,
} from "../src/quality/scope.js";

const execFileAsync = promisify(execFile);
const roots: string[] = [];

afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

async function createGitProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-scope-"));
  roots.push(root);
  await execFileAsync("git", ["-C", root, "init", "-q"]);
  await execFileAsync("git", [
    "-C",
    root,
    "config",
    "user.email",
    "test@example.com",
  ]);
  await execFileAsync("git", ["-C", root, "config", "user.name", "Test"]);
  await writeFile(path.join(root, "README.md"), "test\n");
  await execFileAsync("git", ["-C", root, "add", "."]);
  await execFileAsync("git", ["-C", root, "commit", "-q", "-m", "initial"]);
  return root;
}

describe("computeCurrentRevision", () => {
  it("returns the current HEAD sha and dirty=false on a clean tree", async () => {
    const root = await createGitProject();
    const { stdout } = await execFileAsync("git", [
      "-C",
      root,
      "rev-parse",
      "HEAD",
    ]);
    const result = await computeCurrentRevision(root);
    expect(result).toEqual({ sha: stdout.trim(), dirty: false });
  });

  it("returns dirty=true when the working tree has uncommitted changes", async () => {
    const root = await createGitProject();
    await writeFile(path.join(root, "README.md"), "changed\n");
    const result = await computeCurrentRevision(root);
    expect(result).toMatchObject({ dirty: true });
    expect(result?.worktreeFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the working-tree fingerprint when dirty content changes", async () => {
    const root = await createGitProject();
    await writeFile(path.join(root, "README.md"), "changed once\n");
    const first = await computeCurrentRevision(root);
    await writeFile(path.join(root, "README.md"), "changed twice\n");
    const second = await computeCurrentRevision(root);
    expect(first?.worktreeFingerprint).not.toBe(second?.worktreeFingerprint);
  });

  it("returns undefined when the directory is not a git repository", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-scope-nogit-"),
    );
    roots.push(root);
    const result = await computeCurrentRevision(root);
    expect(result).toBeUndefined();
  });
});

describe("computeCurrentEnvironment", () => {
  it("returns the running platform, Node major version, and CI flag", () => {
    const result = computeCurrentEnvironment();
    expect(result.platform).toBe(process.platform);
    expect(result.nodeMajor).toBe(
      Number(process.version.replace(/^v/, "").split(".")[0]),
    );
    expect(typeof result.ci).toBe("boolean");
  });
});

describe("computeGateDefinitionFingerprint", () => {
  it("returns a stable fingerprint for a built-in check based on the running entrypoint", async () => {
    const entrypointUrl = pathToFileURL(
      path.join(process.cwd(), "test", "quality-scope.test.ts"),
    ).href;
    const first = await computeGateDefinitionFingerprint("file-access", {
      qualityGates: [],
      entrypointUrl,
    });
    const second = await computeGateDefinitionFingerprint("file-access", {
      qualityGates: [],
      entrypointUrl,
    });
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("returns different fingerprints for different config entries of a command.* check", async () => {
    const entrypointUrl = pathToFileURL(
      path.join(process.cwd(), "test", "quality-scope.test.ts"),
    ).href;
    const first = await computeGateDefinitionFingerprint("command.test", {
      qualityGates: [
        { id: "test", command: "pnpm", args: ["test"], timeoutMs: 120_000 },
      ],
      entrypointUrl,
    });
    const second = await computeGateDefinitionFingerprint("command.test", {
      qualityGates: [
        { id: "test", command: "npm", args: ["test"], timeoutMs: 120_000 },
      ],
      entrypointUrl,
    });
    expect(first).not.toBe(second);
  });

  it("returns a stable fingerprint for the same command.* config entry", async () => {
    const entrypointUrl = pathToFileURL(
      path.join(process.cwd(), "test", "quality-scope.test.ts"),
    ).href;
    const gates = [
      { id: "test", command: "pnpm", args: ["test"], timeoutMs: 120_000 },
    ];
    const first = await computeGateDefinitionFingerprint("command.test", {
      qualityGates: gates,
      entrypointUrl,
    });
    const second = await computeGateDefinitionFingerprint("command.test", {
      qualityGates: gates,
      entrypointUrl,
    });
    expect(first).toBe(second);
  });

  it("shares one fingerprint across different built-in check ids", async () => {
    const entrypointUrl = pathToFileURL(
      path.join(process.cwd(), "test", "quality-scope.test.ts"),
    ).href;
    const fileAccess = await computeGateDefinitionFingerprint("file-access", {
      qualityGates: [],
      entrypointUrl,
    });
    const secretScan = await computeGateDefinitionFingerprint("secret-scan", {
      qualityGates: [],
      entrypointUrl,
    });
    expect(fileAccess).toBe(secretScan);
  });
});
