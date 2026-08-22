import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runDomainCommand } from "../src/commands/domain.js";

describe("domain command", () => {
  it("rejects unsupported argument shapes deterministically", async () => {
    const errors: string[] = [];
    const result = await runDomainCommand({
      args: ["unknown"],
      startDirectory: process.cwd(),
      output: {
        stdout: () => undefined,
        stderr: (message) => errors.push(message),
      },
    });
    expect(result).toBe(2);
    expect(errors[0]).toContain("Usage: autoforge domain");
  });

  it("reports a friendly not-initialized message instead of throwing", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "autoforge-domain-"));
    try {
      await mkdir(path.join(project, ".git"));
      const errors: string[] = [];
      const result = await runDomainCommand({
        args: ["list"],
        startDirectory: project,
        output: {
          stdout: () => undefined,
          stderr: (message) => errors.push(message),
        },
      });
      expect(result).toBe(4);
      expect(errors[0]).toBe(
        "No domain artifact found. Run `domain init` first.",
      );
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });
});
