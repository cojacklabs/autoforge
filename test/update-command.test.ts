import { describe, expect, it, vi } from "vitest";
import { runUpdateCommand } from "../src/commands/update.js";

describe("update command", () => {
  it("rejects removed update subcommands", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(runUpdateCommand({ args: ["--check"], output })).resolves.toBe(
      2,
    );
    expect(output.stderr).toHaveBeenCalledWith("Usage: autoforge update");
  });
});
