import { describe, expect, it } from "vitest";

import { recommendWorkflow } from "../../src/intent/workflow.js";

describe("workflow recommendation", () => {
  it("routes unresolved intent through clarification and research", () => {
    const result = recommendWorkflow(
      ["RESEARCH_REQUIRED", "CLARIFICATION_REQUIRED"],
      "needs-input",
    );
    expect(result.stages).toEqual(["clarification", "research"]);
  });

  it("routes ready intent through implementation and validation", () => {
    const result = recommendWorkflow(["READY_FOR_IMPLEMENTATION"], "ready");
    expect(result.stages).toEqual(["implementation", "validation"]);
  });

  it("defaults ambiguous intent to planning", () => {
    const result = recommendWorkflow([], "not-ready");
    expect(result.stages).toEqual(["planning"]);
  });

  it("explains every label-driven stage even when work is deferred", () => {
    const result = recommendWorkflow(
      ["ARCHITECTURE_REQUIRED", "DESIGN_REQUIRED", "DEFERRED"],
      "ready",
    );
    expect(result.stages).toEqual(["architecture", "design"]);
    expect(result.rationale).toEqual([
      "Architecture-required evidence calls for system design work.",
      "Design-required evidence calls for UI or UX definition.",
    ]);
  });
});
