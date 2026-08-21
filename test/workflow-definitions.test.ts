import { describe, expect, it } from "vitest";

import {
  getWorkflowDefinition,
  listWorkflowDefinitions,
} from "../src/workflows/definitions.js";

describe("workflow definitions", () => {
  it("registers every v0.9 core workflow", () => {
    expect(
      listWorkflowDefinitions().map((definition) => definition.kind),
    ).toEqual([
      "feature-development",
      "bug-fix",
      "research",
      "design-create",
      "design-critique",
      "architecture-change",
      "validation",
    ]);
  });

  it("returns ordered required and optional stages", () => {
    const definition = getWorkflowDefinition("feature-development");
    expect(definition.stages.map((stage) => stage.id)).toEqual([
      "research",
      "planning",
      "design",
      "implementation",
      "validation",
    ]);
    expect(definition.stages.filter((stage) => stage.required)).toHaveLength(3);
  });
});
