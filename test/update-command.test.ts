import { describe, expect, it, vi } from "vitest";
import { runUpdateCommand } from "../src/commands/update.js";

describe("update command", () => {
  it("prints the detected package-manager command in dry-run mode", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(
      runUpdateCommand({ args: ["--dry-run"], output, packageManager: "pnpm" }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      "pnpm add -g @cojacklabs/autoforge@latest",
    );
  });
});
