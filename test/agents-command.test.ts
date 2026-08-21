import { describe, expect, it, vi } from "vitest";

import { runAgentsCommand } from "../src/commands/agents.js";

describe("agents command", () => {
  it("lists supported adapter capabilities", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(runAgentsCommand({ args: ["list"], output })).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("codex\tsetup=automatic"),
    );
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("claude\tsetup=automatic"),
    );
    expect(output.stderr).not.toHaveBeenCalled();
  });
});
