import { describe, expect, it } from "vitest";

import { AutoForgeError } from "../src/core/errors.js";
import { createInitialDoctrineRegistry } from "../src/doctrine/builtins.js";
import { routeDoctrines } from "../src/doctrine/router.js";

const TIMESTAMP = "2026-08-20T09:00:00.000Z";

describe("doctrine router", () => {
  it("selects active doctrines from explicit signals with reasons", () => {
    const selections = routeDoctrines(
      createInitialDoctrineRegistry(TIMESTAMP),
      {
        objective: "Build and test a frontend component",
        workKind: "task",
        scopeTags: ["design"],
        paths: ["src/components/dashboard.tsx", "test/dashboard.test.tsx"],
      },
    );

    expect(selections.map((selection) => selection.doctrine.name)).toEqual([
      "router",
      "testing",
      "frontend",
      "design",
      "planning",
      "scope",
    ]);
    expect(
      selections.find((selection) => selection.doctrine.name === "frontend"),
    ).toMatchObject({
      score: 60,
      reasons: expect.arrayContaining([
        { signal: "keyword", value: "component", weight: 10 },
        {
          signal: "path-pattern",
          value: "src/components/**",
          weight: 40,
        },
      ]),
    });
  });

  it("always selects the router and excludes disabled doctrines", () => {
    const registry = createInitialDoctrineRegistry(TIMESTAMP);
    registry.doctrines = registry.doctrines.map((doctrine) =>
      doctrine.name === "security"
        ? { ...doctrine, status: "disabled" }
        : doctrine,
    );

    expect(
      routeDoctrines(registry, {}).map((item) => item.doctrine.name),
    ).toEqual(["router"]);
    expect(
      routeDoctrines(registry, { objective: "security secret auth" }).map(
        (item) => item.doctrine.name,
      ),
    ).not.toContain("security");
  });

  it("uses doctrine IDs to break equal-score ties", () => {
    const selections = routeDoctrines(
      createInitialDoctrineRegistry(TIMESTAMP),
      {
        objective: "backend security",
      },
    );

    expect(selections.map((selection) => selection.doctrine.name)).toEqual([
      "router",
      "backend",
      "security",
    ]);
  });

  it("rejects unsafe paths and invalid limits", () => {
    const registry = createInitialDoctrineRegistry(TIMESTAMP);

    expect(() =>
      routeDoctrines(registry, { paths: ["../outside.ts"] }),
    ).toThrowError(AutoForgeError);
    expect(() => routeDoctrines(registry, { limit: 0 })).toThrowError(
      AutoForgeError,
    );
  });
});
