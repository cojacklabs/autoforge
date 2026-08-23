import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildTwinProjection } from "../src/twin/projection.js";
import { TwinProjectionStore } from "../src/twin/store.js";

const roots: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe("digital twin projection store", () => {
  it("reads missing state and atomically persists projections", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-twin-"));
    roots.push(root);
    const store = new TwinProjectionStore(root);
    expect(await store.read()).toBeNull();

    const projection = buildTwinProjection({
      projectId: "project.example",
      generatedAt: "2026-08-22T12:00:00.000Z",
      nodes: [],
      edges: [],
    });
    await store.write(projection);

    expect(await store.read()).toEqual(projection);
    expect(
      await readFile(
        path.join(root, ".autoforge/twin/projection.json"),
        "utf8",
      ),
    ).toContain('"schemaVersion": 1');
  });

  it("treats a cache using a no-longer-valid node type as absent instead of throwing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-twin-"));
    roots.push(root);
    const cacheDir = path.join(root, ".autoforge/twin");
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      path.join(cacheDir, "projection.json"),
      JSON.stringify({
        schemaVersion: 1,
        projectId: "project.example",
        generatedAt: "2026-08-22T12:00:00.000Z",
        nodes: [
          {
            id: "work.legacy",
            type: "work",
            title: "Legacy work node",
            source: ".autoforge/state/work.json",
            updatedAt: "2026-08-22T12:00:00.000Z",
          },
        ],
        edges: [],
      }),
      "utf8",
    );

    const store = new TwinProjectionStore(root);
    expect(await store.read()).toBeNull();
  });
});
