import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";

const execFileAsync = promisify(execFile);
const packageName = "@cojacklabs/autoforge";

export interface UpdateCommandOptions {
  args: readonly string[];
  output: LogWriter;
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

function updateArgs(packageManager: "npm" | "pnpm"): string[] {
  return packageManager === "pnpm"
    ? ["add", "-g", `${packageName}@latest`]
    : ["install", "-g", `${packageName}@latest`];
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
  const args = updateArgs(packageManager);
  if (mode === "--dry-run") {
    options.output.stdout(`${packageManager} ${args.join(" ")}`);
    return EXIT_CODE.success;
  }
  if (mode === "--check") {
    try {
      const result = await execFileAsync("npm", [
        "view",
        packageName,
        "version",
      ]);
      options.output.stdout(`Latest ${packageName}: ${result.stdout.trim()}`);
      return EXIT_CODE.success;
    } catch {
      options.output.stderr("Unable to check the npm registry.");
      return EXIT_CODE.unexpected;
    }
  }
  try {
    await execFileAsync(packageManager, args, { env: process.env });
    options.output.stdout(
      "AutoForge updated. Run `autoforge version` and `autoforge doctor` to verify.",
    );
    return EXIT_CODE.success;
  } catch {
    options.output.stderr(`Unable to update AutoForge with ${packageManager}.`);
    return EXIT_CODE.unexpected;
  }
}
