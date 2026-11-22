import { spawnSync } from "node:child_process";
import { mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION } from "@cojacklabs/priozar-protocol";
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
      name: "@cojacklabs/priozar-agent",
      version: "0.1.0",
      launchProtocolVersion: PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION,
    });
    write.mockRestore();
  });

  it("runs through the package bin when its installation path contains spaces", async () => {
    const installation = await mkdtemp(
      path.join(tmpdir(), "priozar agent installation "),
    );
    const executable = path.join(installation, "priozar agent.js");
    await symlink(
      path.join(packageRoot, "bin", "priozar-agent.js"),
      executable,
    );

    const result = spawnSync(
      process.execPath,
      [executable, "version", "--json"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      name: "@cojacklabs/priozar-agent",
      launchProtocolVersion: PRIOZAR_AGENT_LAUNCH_PROTOCOL_VERSION,
    });
  });

  it("keeps the deprecated autoforge-agent alias working without noise", () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(packageRoot, "bin", "autoforge-agent.js"),
        "version",
        "--json",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      name: "@cojacklabs/priozar-agent",
    });
    // Not a terminal, so no deprecation notice reaches scripts or CI.
    expect(result.stderr).toBe("");
  });
});
