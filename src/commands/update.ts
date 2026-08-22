import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";

const execFileAsync = promisify(execFile);
const packageName = "@cojacklabs/autoforge";

export interface UpdateCommandOptions {
  args: readonly string[];
  output: LogWriter;
  globalInstall?: boolean;
}

function usage(output: LogWriter): ExitCode {
  output.stderr("Usage: autoforge update");
  return EXIT_CODE.usage;
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
  if (options.args.length > 0) return usage(options.output);
  let version: string;
  try {
    version = await latestVersion();
  } catch {
    options.output.stderr(
      "Unable to resolve the latest AutoForge version from npm.",
    );
    return EXIT_CODE.unexpected;
  }
  try {
    await execFileAsync(
      "npm",
      [
        "install",
        ...(options.globalInstall ? ["--global"] : []),
        `${packageName}@${version}`,
      ],
      {
        env: process.env,
      },
    );
    options.output.stdout(
      `AutoForge updated to ${version}. Run \`autoforge version\` to verify.`,
    );
    return EXIT_CODE.success;
  } catch {
    options.output.stderr(
      "Unable to install the latest AutoForge version with npm.",
    );
    return EXIT_CODE.unexpected;
  }
}
