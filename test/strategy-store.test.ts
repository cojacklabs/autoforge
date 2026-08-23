import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { StrategyStore } from "../src/strategy/strategy-store.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("StrategyStore", () => {
  it("initializes an empty memory file on first ensure()", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-strategy-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new StrategyStore(projectRoot);

    await store.ensure();
    const { state } = await store.state.read();

    expect(state.data.assessments).toEqual([]);
  });

  it("does not overwrite an existing file when ensure() is called again", async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-strategy-store-"),
    );
    temporaryDirectories.push(projectRoot);
    const store = new StrategyStore(projectRoot);

    await store.ensure();
    const { state: firstRead } = await store.state.read();
    const written = await store.state.write(
      { assessments: [] },
      { expectedRevision: firstRead.revision },
    );
    await store.ensure();
    const { state: secondRead } = await store.state.read();

    expect(secondRead.revision).toBe(written.revision);
  });
});
