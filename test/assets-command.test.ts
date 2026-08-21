import { describe, expect, it, vi } from "vitest";
import { runAssetsCommand } from "../src/commands/assets.js";

describe("assets command", () => {
  it("rejects incomplete asset queries", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await expect(runAssetsCommand({ args: ["list"], output })).resolves.toBe(2);
    expect(output.stderr).toHaveBeenCalledWith(
      "Usage: autoforge assets list templates|doctrines",
    );
  });
});
