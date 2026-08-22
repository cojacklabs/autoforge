import { describe, expect, it, vi } from "vitest";

import { runSchemasCommand } from "../src/commands/schemas.js";
import {
  inputSchemaJson,
  listInputSchemas,
} from "../src/input-schemas/catalog.js";

describe("input schema catalog", () => {
  it("publishes schemas for every JSON-file command family", () => {
    expect(listInputSchemas()).toEqual([
      "bootstrap-discover",
      "bootstrap-discovery-questions",
      "intent-assess",
      "intent-register",
      "orchestrate-handoff",
      "orchestrate-plan",
      "projects-global-import",
      "research-register",
      "workflow-handoff",
    ]);
    expect(inputSchemaJson("intent-assess")).toMatchObject({
      type: "object",
      properties: { raw: { type: "string" } },
    });
  });

  it("lists and renders schemas through the CLI command", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await runSchemasCommand({ args: ["list"], output });
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining("workflow-handoff"),
    );
    await runSchemasCommand({
      args: ["show", "bootstrap-discover"],
      output,
    });
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"approved"'),
    );
  });
});
