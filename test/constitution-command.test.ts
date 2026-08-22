import { describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runConstitutionCommand } from "../src/commands/constitution.js";

describe("constitution command", () => {
  it("initializes, lists, shows, and checks a constitution", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-constitution-"),
    );
    try {
      await mkdir(path.join(project, ".git"));
      const output = { stdout: vi.fn(), stderr: vi.fn() };
      await expect(
        runConstitutionCommand({
          args: ["init"],
          output,
          startDirectory: project,
        }),
      ).resolves.toBe(0);
      await expect(
        runConstitutionCommand({
          args: ["list"],
          output,
          startDirectory: project,
        }),
      ).resolves.toBe(0);
      expect(output.stdout.mock.calls[1]?.[0]).toContain(
        "constitution.project.no-silent-drift",
      );
      await expect(
        runConstitutionCommand({
          args: ["show", "constitution.project.no-silent-drift"],
          output,
          startDirectory: project,
        }),
      ).resolves.toBe(0);
      await expect(
        runConstitutionCommand({
          args: ["check", "Implement a feature"],
          output,
          startDirectory: project,
        }),
      ).resolves.toBe(0);
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });

  it("reports a friendly not-initialized message instead of throwing", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-constitution-"),
    );
    try {
      await mkdir(path.join(project, ".git"));
      const output = { stdout: vi.fn(), stderr: vi.fn() };
      const result = await runConstitutionCommand({
        args: ["list"],
        output,
        startDirectory: project,
      });
      expect(result).toBe(4);
      expect(output.stderr).toHaveBeenCalledWith(
        "No project constitution found. Run `constitution init` first.",
      );
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });
});
