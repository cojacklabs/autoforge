import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getWorkflowContextPolicy } from "../src/context/workflow-policy.js";

describe("workflow context policies", () => {
  it("prioritizes research artifacts during research", () => {
    expect(
      getWorkflowContextPolicy("feature-development", "research")
        .preferredTypes[0],
    ).toBe("research");
  });

  it("returns a safe empty policy for unknown stages", () => {
    expect(getWorkflowContextPolicy("validation", "unknown")).toMatchObject({
      stage: "unknown",
      preferredTypes: [],
    });
  });

  it("keeps the canonical ranking fixture aligned with research policy", async () => {
    const fixture = JSON.parse(
      await readFile(
        path.join(process.cwd(), "test/fixtures/workflow/context-ranking.json"),
        "utf8",
      ),
    ) as {
      workflowKind: "feature-development";
      stage: string;
      expectedPreferredType: string;
    };
    const policy = getWorkflowContextPolicy(
      fixture.workflowKind,
      fixture.stage,
    );
    expect(policy.preferredTypes[0]).toBe(fixture.expectedPreferredType);
  });
});
