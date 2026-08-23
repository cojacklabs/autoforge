import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { HypothesisStore } from "../../src/learning/hypothesis-store.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("hypothesis store", () => {
  it("lazily initializes on first ensure()", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-hypothesis-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new HypothesisStore(projectRoot);
    await store.ensure();
    await expect(store.state.read()).resolves.toMatchObject({
      state: { revision: 0, data: { hypotheses: [] } },
    });
  });

  it("ensure() is idempotent", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-hypothesis-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new HypothesisStore(projectRoot);
    await store.ensure();
    await store.state.write({ hypotheses: [] }, { expectedRevision: 0 });
    await store.ensure();
    await expect(store.state.read()).resolves.toMatchObject({
      state: { revision: 1 },
    });
  });
});
