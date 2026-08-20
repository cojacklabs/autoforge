import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runDesignCommand } from "../src/commands/design.js";
import { initializeProject } from "../src/commands/init.js";
import { EXIT_CODE } from "../src/core/errors.js";
import { serializeSpecificationMarkdown } from "../src/specifications/codec.js";
import { designSpecificationSchema } from "../src/specifications/schemas.js";

const temporaryDirectories: string[] = [];

async function createProject(): Promise<string> {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-design-command-"),
  );
  temporaryDirectories.push(projectRoot);
  await mkdir(path.join(projectRoot, ".git"));
  await initializeProject({ projectRoot });
  return projectRoot;
}

function tokenMarkdown(): string {
  return serializeSpecificationMarkdown(
    designSpecificationSchema.parse({
      id: "token.spacing-compact",
      type: "token",
      name: "Compact spacing",
      description: "Spacing for compact dashboard layouts.",
      relationships: { "used-by": ["screen.dashboard"] },
      tags: ["design", "dashboard", "spacing"],
      source: "manual:design-system",
      updatedAt: "2026-08-20T18:00:00.000Z",
      design: {
        kind: "token",
        category: "spacing",
        value: "0.75rem",
        modes: { comfortable: "1rem" },
      },
      content: "# Compact spacing\n\nUse for dense dashboard card groups.",
    }),
  );
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("design command", () => {
  it("validates, imports, lists, filters, and shows a typed design spec", async () => {
    const projectRoot = await createProject();
    await writeFile(path.join(projectRoot, "compact.md"), tokenMarkdown());
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDesignCommand({
        args: ["validate", "compact.md"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenLastCalledWith(
      "Valid design specification token.spacing-compact (token).",
    );

    await expect(
      runDesignCommand({
        args: ["import", "compact.md"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenLastCalledWith(
      expect.stringContaining(
        ".autoforge/specifications/token/spacing-compact.md",
      ),
    );

    await runDesignCommand({
      args: ["list", "--type", "token"],
      output,
      startDirectory: projectRoot,
    });
    expect(output.stdout).toHaveBeenLastCalledWith(
      expect.stringContaining("token.spacing-compact [token]"),
    );

    await runDesignCommand({
      args: ["show", "token.spacing-compact"],
      output,
      startDirectory: projectRoot,
    });
    expect(output.stdout).toHaveBeenLastCalledWith(
      expect.stringContaining("kind: token"),
    );
    expect(output.stderr).not.toHaveBeenCalled();
  });

  it("rejects untyped design files, invalid types, and malformed actions", async () => {
    const projectRoot = await createProject();
    await writeFile(
      path.join(projectRoot, "generic.md"),
      "---\nid: screen.generic\ntype: screen\nname: Generic\ndescription: Missing design metadata.\nrelationships: {}\ntags: []\nsource: manual\nupdatedAt: 2026-08-20T18:00:00.000Z\n---\n\n# Generic\n",
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runDesignCommand({
        args: ["validate", "generic.md"],
        output,
        startDirectory: projectRoot,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(
      runDesignCommand({
        args: ["list", "--type", "architecture"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
    await expect(
      runDesignCommand({
        args: ["unknown"],
        output,
        startDirectory: projectRoot,
      }),
    ).resolves.toBe(EXIT_CODE.usage);
  });
});
