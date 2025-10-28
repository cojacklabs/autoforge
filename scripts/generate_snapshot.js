#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const SNAPSHOT_FILENAME = "REPO.md";
const CONFIG_FILENAME = "repomix.config.json";
const AUTOFORGE_DIR_NAMES = [".autoforge", "autoforge"]; // prefer hidden name

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const cwd = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findPackageRoot(startDir) {
  let current = startDir;
  while (true) {
    const candidate = path.join(
      current,
      "node_modules",
      "autoforge",
      "package.json",
    );
    if (fs.existsSync(candidate)) {
      return path.dirname(candidate);
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

const defaultTarget = AUTOFORGE_DIR_NAMES.includes(path.basename(cwd))
  ? path.resolve(cwd, "..")
  : cwd;
const targetDir = args[0] ? path.resolve(cwd, args[0]) : defaultTarget;
const configPath = path.join(targetDir, CONFIG_FILENAME);
const outputPath = path.join(targetDir, SNAPSHOT_FILENAME);

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

function ensureConfig() {
  if (fs.existsSync(configPath)) {
    return false;
  }
  const config = {
    output: {
      style: "markdown",
      filePath: SNAPSHOT_FILENAME,
      removeComments: true,
      showLineNumbers: true,
      topFilesLength: 20,
    },
    ignore: {
      customPatterns: [
        "**/.git/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.cache/**",
        "**/*.log",
        "**/*.tmp",
        ".autoforge/**",
        "autoforge/**",
        "**/ai/logs/**",
        "**/ai/reports/**",
      ],
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Using temporary ${CONFIG_FILENAME} in ${targetDir}`);
  return true;
}

async function main() {
  try {
    if (!fs.existsSync(targetDir)) {
      throw new Error(`Target directory does not exist: ${targetDir}`);
    }

    const createdConfig = ensureConfig();
    const packageRoot = findPackageRoot(__dirname);
    const env = { ...process.env };
    if (packageRoot) {
      const binDir = path.join(packageRoot, "node_modules", ".bin");
      env.PATH = env.PATH ? `${binDir}${path.delimiter}${env.PATH}` : binDir;
    }
    await run("npx", ["--yes", "repomix"], { cwd: targetDir, env });
    console.log(`Repository snapshot written to ${outputPath}`);

    if (createdConfig) {
      try {
        fs.unlinkSync(configPath);
      } catch (err) {
        // Ignore cleanup errors so the command remains successful.
      }
    }
  } catch (err) {
    console.error("Failed to generate repository snapshot:", err.message);
    console.error(
      "Hint: ensure `npm install autoforge` completed successfully so bundled dependencies like repomix are available.",
    );
    process.exitCode = 1;
  }
}

main();
