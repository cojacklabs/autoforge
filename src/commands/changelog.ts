import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  compileChangelogSection,
  upsertChangelogSection,
} from "../changelog/compile.js";
import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { discoverProjectRoot } from "../core/project.js";
import { createDecisionStore } from "../decisions/store.js";

const execFileAsync = promisify(execFile);

export interface ChangelogCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr("Usage: autoforge changelog compile [--since <git-tag>]");
  return EXIT_CODE.usage;
}

async function resolveSinceTimestamp(
  projectRoot: string,
  sinceTag: string | undefined,
): Promise<string> {
  try {
    const tag =
      sinceTag ??
      (
        await execFileAsync("git", ["describe", "--tags", "--abbrev=0"], {
          cwd: projectRoot,
        })
      ).stdout.trim();
    const { stdout } = await execFileAsync(
      "git",
      ["log", "-1", "--format=%aI", tag],
      { cwd: projectRoot },
    );
    return stdout.trim();
  } catch {
    return new Date(0).toISOString();
  }
}

export async function runChangelogCommand(
  options: ChangelogCommandOptions,
): Promise<ExitCode> {
  const [action, flag, value, ...rest] = options.args;
  if (action !== "compile" || rest.length > 0) {
    return usage(options.output);
  }
  if (flag !== undefined && (flag !== "--since" || !value)) {
    return usage(options.output);
  }

  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const sinceTimestamp = await resolveSinceTimestamp(
    project.path,
    flag === "--since" ? value : undefined,
  );
  const { state } = await createDecisionStore(project.path).read();
  const section = compileChangelogSection({
    decisions: state.data.decisions,
    sinceTimestamp,
  });

  const changelogPath = path.join(project.path, "CHANGELOG.md");
  let existing: string;
  try {
    existing = await readFile(changelogPath, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      options.output.stderr("No CHANGELOG.md found in this project.");
      return EXIT_CODE.invalidState;
    }
    throw error;
  }

  const updated = upsertChangelogSection(existing, section);
  await writeFile(changelogPath, updated, "utf8");

  options.output.stdout(
    section
      ? "Compiled changelog entries into CHANGELOG.md."
      : "No qualifying decisions found; CHANGELOG.md unchanged.",
  );
  return EXIT_CODE.success;
}
