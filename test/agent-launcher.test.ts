import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  agentExecutableForPlatform,
  agentChildEnvironment,
  AGENT_EXECUTABLES,
  agentProcessInvocationForPlatform,
  inspectAgentExecutables,
  windowsAgentShimName,
  currentAgentLaunchEnvironment,
  forwardAgentSignals,
  launchPriozarAgent,
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

describe("Priozar Agent launcher", () => {
  it("forwards arguments and the Agent exit code", async () => {
    const dependencies = harness("compatible");
    await expect(
      launchPriozarAgent(["credentials", "status", "openai"], {
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
      launchPriozarAgent([], { ...dependencies, environment }),
    ).resolves.toBeUndefined();
    expect(dependencies.host.inspect).not.toHaveBeenCalled();
  });

  it.each(["missing", "incompatible"] as const)(
    "falls back for bare invocation when the Agent is %s",
    async (compatibility) => {
      const dependencies = harness(compatibility);
      await expect(
        launchPriozarAgent([], {
          ...dependencies,
          environment: interactive,
        }),
      ).resolves.toBeUndefined();
    },
  );

  it("gives installation guidance for an explicit missing Agent command", async () => {
    const dependencies = harness("missing");
    await expect(
      launchPriozarAgent(["credentials", "status", "openai"], {
        ...dependencies,
        environment: interactive,
      }),
    ).resolves.toBe(EXIT_CODE.invalidState);
    expect(dependencies.output.stderr).toHaveBeenCalledWith(
      expect.stringContaining("not installed"),
    );
  });

  it.each([
    ["linux", "priozar-agent"],
    ["darwin", "priozar-agent"],
    ["win32", "priozar-agent.cmd"],
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
        "priozar-agent.cmd",
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
            '  echo {"name":"@cojacklabs/priozar-agent","version":"0.1.0","launchProtocolVersion":1}',
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
    // The preferred name is searched everywhere before the fallback is tried.
    expect(inspected.at(-1)).toMatch(/autoforge-agent\.cmd$/);
    expect(inspected.some((candidate) => candidate.includes("D:\\bin"))).toBe(
      true,
    );
  });

  it("launches the Unix executable directly", () => {
    expect(
      agentProcessInvocationForPlatform("linux", ["version", "--json"]),
    ).toEqual({
      command: "priozar-agent",
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

describe("Priozar Agent launcher environment variables", () => {
  const quiet = { stdinIsTTY: true, stdoutIsTTY: true } as const;
  const read = (env: Record<string, string | undefined>) =>
    currentAgentLaunchEnvironment(env, quiet);

  it("disables delegation from PRIOZAR_NO_AGENT or the deprecated name", () => {
    expect(read({ PRIOZAR_NO_AGENT: "1" }).disabled).toBe(true);
    expect(read({ AUTOFORGE_NO_AGENT: "1" }).disabled).toBe(true);
    expect(read({}).disabled).toBe(false);
  });

  it("lets PRIOZAR_NO_AGENT override the deprecated variable", () => {
    expect(
      read({ PRIOZAR_NO_AGENT: "0", AUTOFORGE_NO_AGENT: "1" }).disabled,
    ).toBe(false);
  });

  it("treats either recursion marker as recursion", () => {
    expect(read({ PRIOZAR_AGENT_LAUNCHED: "1" }).recursion).toBe(true);
    expect(read({ AUTOFORGE_AGENT_LAUNCHED: "1" }).recursion).toBe(true);
    expect(read({}).recursion).toBe(false);
  });

  it("marks launched children under both names so older agents see it", () => {
    expect(agentChildEnvironment({ KEEP: "me" })).toEqual({
      KEEP: "me",
      PRIOZAR_AGENT_LAUNCHED: "1",
      AUTOFORGE_AGENT_LAUNCHED: "1",
    });
  });
});

describe("AutoForge Agent executable fallback", () => {
  it("prefers priozar-agent and keeps autoforge-agent as the fallback", () => {
    expect(AGENT_EXECUTABLES).toEqual(["priozar-agent", "autoforge-agent"]);
    expect(agentExecutableForPlatform("linux", "autoforge-agent")).toBe(
      "autoforge-agent",
    );
    expect(
      agentProcessInvocationForPlatform(
        "linux",
        ["version"],
        undefined,
        "autoforge-agent",
      ),
    ).toEqual({ command: "autoforge-agent", args: ["version"] });
  });

  it("uses the preferred executable when it is installed", async () => {
    const probe = vi.fn(async () => "compatible" as const);
    await expect(
      inspectAgentExecutables(AGENT_EXECUTABLES, probe),
    ).resolves.toEqual({ status: "compatible", executable: "priozar-agent" });
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("falls back to autoforge-agent only when the preferred one is missing", async () => {
    const probe = vi.fn(async (executable: string) =>
      executable === "priozar-agent"
        ? ("missing" as const)
        : ("compatible" as const),
    );
    await expect(
      inspectAgentExecutables(AGENT_EXECUTABLES, probe),
    ).resolves.toEqual({ status: "compatible", executable: "autoforge-agent" });
  });

  it("does not mask an incompatible preferred agent with an older install", async () => {
    const probe = vi.fn(async () => "incompatible" as const);
    await expect(
      inspectAgentExecutables(AGENT_EXECUTABLES, probe),
    ).resolves.toEqual({ status: "incompatible", executable: "priozar-agent" });
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("reports missing when no executable is installed", async () => {
    await expect(
      inspectAgentExecutables(AGENT_EXECUTABLES, async () => "missing"),
    ).resolves.toEqual({ status: "missing", executable: undefined });
  });

  it("finds whichever Windows shim is installed, preferring the new name", () => {
    const only = (name: string) => (candidate: string) =>
      candidate.endsWith(name);
    expect(
      windowsAgentShimName(
        "C:\\p",
        { Path: "C:\\bin" },
        only("autoforge-agent.cmd"),
      ),
    ).toBe("autoforge-agent");
    expect(windowsAgentShimName("C:\\p", { Path: "C:\\bin" }, () => true)).toBe(
      "priozar-agent",
    );
    expect(
      windowsAgentShimName("C:\\p", { Path: "C:\\bin" }, () => false),
    ).toBeUndefined();
  });
});
