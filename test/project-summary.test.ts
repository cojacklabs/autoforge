import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectProjectSummary } from "../src/workspace/inventory.js";

describe("project summary", () => {
  it("summarizes work, decisions, designs, and active context", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-summary-"));
    try {
      await mkdir(path.join(root, ".autoforge/state"), { recursive: true });
      await mkdir(path.join(root, ".autoforge/specifications"), {
        recursive: true,
      });
      await writeFile(
        path.join(root, ".autoforge/state/work.json"),
        JSON.stringify({
          data: {
            features: [{}],
            phases: [],
            tasks: [{}],
            issues: [],
            activeWork: { kind: "task", id: "task.example" },
          },
        }),
      );
      await writeFile(
        path.join(root, ".autoforge/state/decisions.json"),
        JSON.stringify({ data: { decisions: [{}] } }),
      );
      await writeFile(
        path.join(root, ".autoforge/specifications/design.md"),
        "# Design",
      );
      const summary = await inspectProjectSummary(root);
      expect(summary.work.features).toBe(1);
      expect(summary.work.tasks).toBe(1);
      expect(summary.decisions).toBe(1);
      expect(summary.designs).toBe(1);
      expect(summary.activeWork?.id).toBe("task.example");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
