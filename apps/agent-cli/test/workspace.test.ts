import { mkdir, mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LocalAgentWorkspace } from "../src/workspace.js";

describe("LocalAgentWorkspace", () => {
  it("writes inside the project and rejects traversal", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "autoforge-agent-"));
    const workspace = new LocalAgentWorkspace(root);
    await workspace.write("nested/file.txt", "safe\n");
    expect(await readFile(path.join(root, "nested/file.txt"), "utf8")).toBe(
      "safe\n",
    );
    await expect(workspace.write("../outside.txt", "unsafe")).rejects.toThrow(
      "escapes the project",
    );
  });

  it("rejects a parent symlink that resolves outside the project", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "autoforge-agent-symlink-"));
    const root = path.join(base, "project");
    const outside = path.join(base, "outside");
    await mkdir(root);
    await mkdir(outside);
    await symlink(outside, path.join(root, "linked"), "dir");

    await expect(
      new LocalAgentWorkspace(root).write("linked/escaped.txt", "unsafe"),
    ).rejects.toThrow("escapes the project");
    await expect(
      readFile(path.join(outside, "escaped.txt")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
});
