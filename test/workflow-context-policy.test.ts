import { describe, expect, it } from "vitest";

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
});
