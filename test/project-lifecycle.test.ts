import { describe, expect, it } from "vitest";
import { projectMutationBlocked } from "../src/workspace/lifecycle.js";

describe("project lifecycle safeguards", () => {
  it("blocks mutations for archived projects but permits inspection", () => {
    const metadata = {
      name: "project",
      lastSeen: "2026-08-22T12:00:00.000Z",
      lifecycle: "archived" as const,
    };
    expect(projectMutationBlocked("add", metadata)).toBe(true);
    expect(projectMutationBlocked("doctor", metadata)).toBe(false);
    expect(projectMutationBlocked("projects", metadata)).toBe(false);
  });

  it("allows all commands for active projects", () => {
    expect(
      projectMutationBlocked("add", {
        name: "project",
        lastSeen: "2026-08-22T12:00:00.000Z",
        lifecycle: "active",
      }),
    ).toBe(false);
  });

  it("treats an undefined lifecycle as blocked, distinct from active", () => {
    const metadata = {
      name: "project",
      lastSeen: "2026-08-22T12:00:00.000Z",
    };
    expect(projectMutationBlocked("add", metadata)).toBe(true);
  });
});
