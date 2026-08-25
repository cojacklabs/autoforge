import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  agentExecutableForPlatform,
  agentProcessInvocationForPlatform,
  forwardAgentSignals,
  launchAutoForgeAgent,
  NativeAgentProcessHost,
  windowsAgentShimAvailable,
  type AgentLaunchEnvironment,
  type AgentProcessHost,
} from "../apps/core-cli/src/agent-launcher.js";
import { EXIT_CODE } from "../src/core/errors.js";

const interactive: AgentLaunchEnvironment = {
  stdinIsTTY: true,
  stdoutIsTTY: true,
  ci: false,
  recursion: false,
  disabled: false,
};

function harness(compatibility: "compatible" | "missing" | "incompatible") {
  const output = { stdout: vi.fn(), stderr: vi.fn() };
  const host: AgentProcessHost = {
    inspect: vi.fn(async () => compatibility),
    run: vi.fn(async () => EXIT_CODE.conflict),
  };
  return { output, host };
}

describe("AutoForge Agent launcher", () => {
  it("forwards arguments and the Agent exit code", async () => {
    const dependencies = harness("compatible");
    await expect(
      launchAutoForgeAgent(["credentials", "status", "openai"], {
        ...dependencies,
        environment: interactive,
      }),
    ).resolves.toBe(EXIT_CODE.conflict);
    expect(dependencies.host.run).toHaveBeenCalledWith([
      "credentials",
      "status",
      "openai",
    ]);
  });

  it.each([
    { ...interactive, stdinIsTTY: false },
    { ...interactive, stdoutIsTTY: false },
    { ...interactive, ci: true },
    { ...interactive, disabled: true },
    { ...interactive, recursion: true },
  ])("falls back for an ineligible bare terminal: %j", async (environment) => {
    const dependencies = harness("compatible");
    await expect(
      launchAutoForgeAgent([], { ...dependencies, environment }),
    ).resolves.toBeUndefined();
    expect(dependencies.host.inspect).not.toHaveBeenCalled();
  });

  it.each(["missing", "incompatible"] as const)(
    "falls back for bare invocation when the Agent is %s",
    async (compatibility) => {
      const dependencies = harness(compatibility);
      await expect(
        launchAutoForgeAgent([], {
          ...dependencies,
          environment: interactive,
        }),
      ).resolves.toBeUndefined();
    },
  );

  it("gives installation guidance for an explicit missing Agent command", async () => {
    const dependencies = harness("missing");
    await expect(
      launchAutoForgeAgent(["credentials", "status", "openai"], {
        ...dependencies,
        environment: interactive,
      }),
    ).resolves.toBe(EXIT_CODE.invalidState);
    expect(dependencies.output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("not installed"),
    );
  });

  it.each([
    ["linux", "autoforge-agent"],
    ["darwin", "autoforge-agent"],
    ["win32", "autoforge-agent.cmd"],
  ] as const)("selects the %s Agent shim", (platform, expected) => {
    expect(agentExecutableForPlatform(platform)).toBe(expected);
  });

  it("runs the Windows npm command shim through cmd.exe", () => {
    expect(
      agentProcessInvocationForPlatform(
        "win32",
        ["credentials", "status", "openai"],
        "C:\\Windows\\System32\\cmd.exe",
      ),
    ).toEqual({
      command: "C:\\Windows\\System32\\cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        "autoforge-agent.cmd",
        "credentials",
        "status",
        "openai",
      ],
    });
  });

  it.runIf(process.platform === "win32")(
    "executes an npm-style Windows command shim through the native host",
    async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "autoforge-agent-launcher-"),
      );
      try {
        await writeFile(
          path.join(directory, "autoforge-agent.cmd"),
          [
            "@echo off",
            'if "%1"=="version" (',
            '  echo {"name":"@cojacklabs/autoforge-agent","version":"0.1.0","launchProtocolVersion":1}',
            "  exit /b 0",
            ")",
            "exit /b 5",
            "",
          ].join("\r\n"),
          "utf8",
        );
        const host = new NativeAgentProcessHost("win32", directory);
        await expect(host.inspect()).resolves.toBe("compatible");
        await expect(
          host.run(["credentials", "status", "openai"]),
        ).resolves.toBe(EXIT_CODE.conflict);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  );

  it("does not send shell metacharacters to the Windows command processor", () => {
    expect(() =>
      agentProcessInvocationForPlatform("win32", ["status&whoami"]),
    ).toThrow("unsafe Windows Agent command argument");
  });

  it("finds the Windows Agent shim through case-insensitive PATH", () => {
    const inspected: string[] = [];
    expect(
      windowsAgentShimAvailable(
        "C:\\project",
        { Path: "C:\\npm;D:\\bin" },
        (candidate) => {
          inspected.push(candidate);
          return candidate.endsWith("autoforge-agent.cmd");
        },
      ),
    ).toBe(true);
    expect(inspected).toHaveLength(1);
  });

  it("launches the Unix executable directly", () => {
    expect(
      agentProcessInvocationForPlatform("linux", ["version", "--json"]),
    ).toEqual({
      command: "autoforge-agent",
      args: ["version", "--json"],
    });
  });

  it("forwards termination signals and removes its listeners", () => {
    const parent = new EventEmitter();
    const child = { kill: vi.fn(() => true) };
    const stop = forwardAgentSignals(
      parent as unknown as Pick<NodeJS.Process, "on" | "off">,
      child,
    );
    parent.emit("SIGINT");
    parent.emit("SIGTERM");
    expect(child.kill).toHaveBeenNthCalledWith(1, "SIGINT");
    expect(child.kill).toHaveBeenNthCalledWith(2, "SIGTERM");
    stop();
    parent.emit("SIGINT");
    expect(child.kill).toHaveBeenCalledTimes(2);
  });
});
