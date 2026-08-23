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
      "data-change",
      "security-change",
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

  it("registers data-change and security-change with an implementation stage", () => {
    const dataChange = getWorkflowDefinition("data-change");
    expect(dataChange.stages.map((stage) => stage.id)).toEqual([
      "research",
      "planning",
      "implementation",
      "validation",
    ]);
    expect(
      dataChange.stages.find((stage) => stage.id === "research")?.required,
    ).toBe(false);
    expect(
      dataChange.stages.filter((stage) => stage.id !== "research"),
    ).toSatisfy((stages: { required: boolean }[]) =>
      stages.every((stage) => stage.required),
    );

    const securityChange = getWorkflowDefinition("security-change");
    expect(securityChange.stages.map((stage) => stage.id)).toEqual([
      "research",
      "planning",
      "implementation",
      "validation",
    ]);
  });
});
