import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  agentLauncherInfoSchema,
  AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION,
  AUTOFORGE_AGENT_RECURSION_ENV,
} from "@cojacklabs/autoforge-protocol";

import { EXIT_CODE, type ExitCode } from "../../../src/core/errors.js";
import type { CliOutput } from "./router.js";

const AGENT_EXECUTABLE = "autoforge-agent";
const WINDOWS_AGENT_ARGUMENT = /^[A-Za-z0-9._:@/+\\=-]+$/;

export function agentExecutableForPlatform(platform: NodeJS.Platform): string {
  return platform === "win32" ? `${AGENT_EXECUTABLE}.cmd` : AGENT_EXECUTABLE;
}

export interface AgentProcessInvocation {
  command: string;
  args: string[];
}

export function agentProcessInvocationForPlatform(
  platform: NodeJS.Platform,
  args: readonly string[],
  commandShell = process.env.ComSpec?.trim() || "cmd.exe",
): AgentProcessInvocation {
  const executable = agentExecutableForPlatform(platform);
  if (platform !== "win32") return { command: executable, args: [...args] };
  const unsafe = args.find(
    (argument) => !WINDOWS_AGENT_ARGUMENT.test(argument),
  );
  if (unsafe !== undefined) {
    throw new Error(
      "AutoForge refused an unsafe Windows Agent command argument.",
    );
  }
  return {
    command: commandShell,
    args: ["/d", "/s", "/c", executable, ...args],
  };
}

export function windowsAgentShimAvailable(
  cwd: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
  exists: (candidate: string) => boolean = existsSync,
): boolean {
  const pathValue = Object.entries(environment).find(
    ([name]) => name.toLowerCase() === "path",
  )?.[1];
  const directories = [cwd ?? process.cwd(), ...(pathValue?.split(";") ?? [])];
  return directories
    .filter(Boolean)
    .some((directory) =>
      exists(path.resolve(directory, `${AGENT_EXECUTABLE}.cmd`)),
    );
}

export interface AgentProcessHost {
  inspect(): Promise<"compatible" | "missing" | "incompatible">;
  run(args: readonly string[]): Promise<ExitCode>;
}

export interface AgentLaunchEnvironment {
  stdinIsTTY: boolean;
  stdoutIsTTY: boolean;
  ci: boolean;
  recursion: boolean;
  disabled: boolean;
}

export interface AgentLauncherOptions {
  output: CliOutput;
  host?: AgentProcessHost;
  environment?: AgentLaunchEnvironment;
  cwd?: string;
}

function currentEnvironment(): AgentLaunchEnvironment {
  return {
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    ci: Boolean(process.env.CI),
    recursion: process.env[AUTOFORGE_AGENT_RECURSION_ENV] === "1",
    disabled: process.env.AUTOFORGE_NO_AGENT === "1",
  };
}

export async function launchAutoForgeAgent(
  args: readonly string[],
  options: AgentLauncherOptions,
): Promise<ExitCode | undefined> {
  const explicit = args.length > 0;
  const environment = options.environment ?? currentEnvironment();
  if (environment.recursion || environment.disabled) {
    if (!explicit) return undefined;
    options.output.stderr(
      "AutoForge Agent delegation is disabled or recursive.",
    );
    return EXIT_CODE.invalidState;
  }
  if (
    !explicit &&
    (!environment.stdinIsTTY || !environment.stdoutIsTTY || environment.ci)
  ) {
    return undefined;
  }

  const host =
    options.host ?? new NativeAgentProcessHost(process.platform, options.cwd);
  const compatibility = await host.inspect();
  if (compatibility !== "compatible") {
    if (!explicit) return undefined;
    options.output.stderr(
      compatibility === "missing"
        ? "AutoForge Agent is not installed. Install @cojacklabs/autoforge-agent to use this command."
        : `AutoForge Agent is incompatible with launcher protocol ${AUTOFORGE_AGENT_LAUNCH_PROTOCOL_VERSION}. Update @cojacklabs/autoforge-agent.`,
    );
    return EXIT_CODE.invalidState;
  }
  return host.run(args);
}

function waitForChild(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) =>
      resolve(code ?? (signal ? 1 : EXIT_CODE.unexpected)),
    );
  });
}

export function forwardAgentSignals(
  parent: Pick<NodeJS.Process, "on" | "off">,
  child: Pick<ChildProcess, "kill">,
): () => void {
  const onInterrupt = () => child.kill("SIGINT");
  const onTerminate = () => child.kill("SIGTERM");
  parent.on("SIGINT", onInterrupt);
  parent.on("SIGTERM", onTerminate);
  return () => {
    parent.off("SIGINT", onInterrupt);
    parent.off("SIGTERM", onTerminate);
  };
}

export class NativeAgentProcessHost implements AgentProcessHost {
  private readonly platform: NodeJS.Platform;
  private readonly cwd: string | undefined;

  constructor(platform: NodeJS.Platform = process.platform, cwd?: string) {
    this.platform = platform;
    this.cwd = cwd;
  }

  async inspect(): Promise<"compatible" | "missing" | "incompatible"> {
    if (this.platform === "win32" && !windowsAgentShimAvailable(this.cwd)) {
      return "missing";
    }
    const invocation = agentProcessInvocationForPlatform(this.platform, [
      "version",
      "--json",
    ]);
    const child = spawn(invocation.command, invocation.args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      cwd: this.cwd,
    });
    let stdout = "";
    const timeout = setTimeout(() => child.kill(), 5_000);
    child.stdout?.setEncoding("utf8").on("data", (chunk) => {
      if (stdout.length < 16_384) stdout += chunk;
    });
    try {
      const exitCode = await waitForChild(child);
      if (exitCode !== 0) return "incompatible";
      return agentLauncherInfoSchema.safeParse(JSON.parse(stdout)).success
        ? "compatible"
        : "incompatible";
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "ENOENT"
        ? "missing"
        : "incompatible";
    } finally {
      clearTimeout(timeout);
    }
  }

  async run(args: readonly string[]): Promise<ExitCode> {
    const invocation = agentProcessInvocationForPlatform(this.platform, args);
    const child = spawn(invocation.command, invocation.args, {
      stdio: "inherit",
      windowsHide: false,
      env: {
        ...process.env,
        [AUTOFORGE_AGENT_RECURSION_ENV]: "1",
      },
      cwd: this.cwd,
    });
    const stopForwarding = forwardAgentSignals(process, child);
    try {
      return (await waitForChild(child)) as ExitCode;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return EXIT_CODE.invalidState;
      }
      throw error;
    } finally {
      stopForwarding();
    }
  }
}
