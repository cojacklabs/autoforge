import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { migrateBrand } from "../src/migrations/brand.js";
import { FRAMEWORK_IDENTITY } from "../src/core/vocabularies.js";

describe("recoverable brand migration", () => {
  it("generates a deterministic dry-run plan without writing changes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "brand-migrate-dryrun-"));
    try {
      const sourceDir = path.join(root, FRAMEWORK_IDENTITY.current.stateDirectory);
      await mkdir(sourceDir);
      await writeFile(path.join(sourceDir, "config.json"), "{}");

      const plan = await migrateBrand({
        projectRoot: root,
        dryRun: true,
      });

      expect(plan.status).toBe("planned");
      expect(plan.sourceDirectory).toBe(FRAMEWORK_IDENTITY.current.stateDirectory);
      expect(plan.targetDirectory).toBe(FRAMEWORK_IDENTITY.successor.stateDirectory);
      expect(plan.backupDirectory).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects dual-directory conflicts and stops cleanly", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "brand-migrate-conflict-"));
    try {
      await mkdir(path.join(root, FRAMEWORK_IDENTITY.current.stateDirectory));
      await mkdir(path.join(root, FRAMEWORK_IDENTITY.successor.stateDirectory));

      await expect(
        migrateBrand({
          projectRoot: root,
          dryRun: false,
        }),
      ).rejects.toThrow(/Dual-directory conflict/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("atomically migrates state, creates a backup, and preserves contract integrity", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "brand-migrate-apply-"));
    try {
      const sourceDir = path.join(root, FRAMEWORK_IDENTITY.current.stateDirectory);
      const targetDir = path.join(root, FRAMEWORK_IDENTITY.successor.stateDirectory);
      await mkdir(path.join(sourceDir, "state"), { recursive: true });
      await writeFile(
        path.join(sourceDir, "agent-contract.json"),
        JSON.stringify({ framework: "AutoForge" }),
      );
      await writeFile(path.join(sourceDir, "state", "work.json"), "{}");

      const result = await migrateBrand({
        projectRoot: root,
        dryRun: false,
      });

      expect(result.status).toBe("migrated");
      expect(result.backupDirectory).toMatch(/^\.autoforge\.backup-/);

      // Verify target directory exists and source directory is cleanly replaced
      const targetContract = JSON.parse(
        await (await import("node:fs/promises")).readFile(
          path.join(targetDir, "agent-contract.json"),
          "utf8",
        ),
      );
      expect(targetContract.framework).toBe(FRAMEWORK_IDENTITY.successor.product);

      const targetWorkExists = await (await import("node:fs/promises"))
        .stat(path.join(targetDir, "state", "work.json"))
        .then(() => true)
        .catch(() => false);
      expect(targetWorkExists).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
