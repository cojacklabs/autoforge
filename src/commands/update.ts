import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";

const execFileAsync = promisify(execFile);
const packageName = "@cojacklabs/autoforge";

export interface UpdateCommandOptions {
  args: readonly string[];
  output: LogWriter;
  currentVersion?: string;
  packageManager?: "npm" | "pnpm";
}

function usage(output: LogWriter): ExitCode {
  output.stderr("Usage: autoforge update [--check | --dry-run | --apply]");
  return EXIT_CODE.usage;
}

function manager(options: UpdateCommandOptions): "npm" | "pnpm" {
  return (
    options.packageManager ??
    (process.env.npm_config_user_agent?.startsWith("pnpm") ? "pnpm" : "npm")
  );
}

function updateArgs(packageManager: "npm" | "pnpm", version: string): string[] {
  return packageManager === "pnpm"
    ? ["add", "-g", `${packageName}@${version}`]
    : ["install", "-g", `${packageName}@${version}`];
}

async function latestVersion(): Promise<string> {
  const result = await execFileAsync("npm", ["view", packageName, "version"]);
  const version = result.stdout.trim();
  if (!version) throw new Error("npm returned an empty version");
  return version;
}

export async function runUpdateCommand(
  options: UpdateCommandOptions,
): Promise<ExitCode> {
  const mode = options.args[0] ?? "--check";
  if (
    options.args.length > 1 ||
    !["--check", "--dry-run", "--apply"].includes(mode)
  ) {
    return usage(options.output);
  }
  const packageManager = manager(options);
  if (mode === "--dry-run") {
    options.output.stdout(
      `${packageManager} ${updateArgs(packageManager, "latest").join(" ")}`,
    );
    return EXIT_CODE.success;
  }
  let version: string;
  try {
    version = await latestVersion();
  } catch {
    options.output.stderr("Unable to check the npm registry.");
    return EXIT_CODE.unexpected;
  }
  if (mode === "--check") {
    if (options.currentVersion && options.currentVersion !== version) {
      options.output.stdout(
        `Update available: AutoForge ${options.currentVersion} → ${version}. Run \`autoforge update --apply\` to install it.`,
      );
    } else {
      options.output.stdout(`AutoForge is up to date (${version}).`);
    }
    return EXIT_CODE.success;
  }
  try {
    await execFileAsync(packageManager, updateArgs(packageManager, version), {
      env: process.env,
    });
    options.output.stdout(
      `AutoForge updated to ${version}. Run \`autoforge version\` and \`autoforge doctor\` to verify.`,
    );
    return EXIT_CODE.success;
  } catch {
    options.output.stderr(`Unable to update AutoForge with ${packageManager}.`);
    return EXIT_CODE.unexpected;
  }
}
