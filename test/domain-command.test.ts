import { describe, expect, it } from "vitest";
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
});
