import { spawnSync } from "node:child_process";
import { mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION } from "@cojacklabs/autoforge-protocol";
import { describe, expect, it, vi } from "vitest";

import { main } from "../src/cli.js";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("Agent CLI launcher protocol", () => {
  it("reports compatibility without opening the keyring", async () => {
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await expect(main(["version", "--json"])).resolves.toBe(0);
    const payload = JSON.parse(String(write.mock.calls[0]?.[0]));
    expect(payload).toEqual({
      name: "@cojacklabs/autoforge-agent",
      version: "0.1.0",
      launchProtocolVersion: AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION,
    });
    write.mockRestore();
  });

  it("runs through the package bin when its installation path contains spaces", async () => {
    const installation = await mkdtemp(
      path.join(tmpdir(), "autoforge agent installation "),
    );
    const executable = path.join(installation, "autoforge agent.js");
    await symlink(
      path.join(packageRoot, "bin", "autoforge-agent.js"),
      executable,
    );

    const result = spawnSync(
      process.execPath,
      [executable, "version", "--json"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      name: "@cojacklabs/autoforge-agent",
      launchProtocolVersion: AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION,
    });
  });
});
