#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import fs from "node:fs";

const targetArg = process.argv[2];
const cwd = process.cwd();
// Default behavior: if running from ./autoforge, summarize parent directory; otherwise summarize CWD.
const defaultDir =
  path.basename(cwd).toLowerCase() === "autoforge"
    ? path.resolve(cwd, "..")
    : cwd;
const targetDir = targetArg ? path.resolve(cwd, targetArg) : defaultDir;
const outputFile = path.join(targetDir, "REPOMIX.md");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function main() {
  try {
    // If the target directory does not have repomix.config.json, create a temporary one
    // that favors summarizing the host project and ignoring the embedded AutoForge folder.
    const targetConfig = path.join(targetDir, "repomix.config.json");
    let wroteTempConfig = false;
    if (!fs.existsSync(targetConfig)) {
      const config = {
        output: {
          style: "markdown",
          filePath: "REPOMIX.md",
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
            // Ignore the embedded AutoForge folder by default when summarizing the host project
            "autoforge/**",
            // Ignore agent-generated logs/reports if the user keeps them at the project root
            "**/ai/logs/**",
            "**/ai/reports/**",
          ],
        },
      };
      fs.writeFileSync(targetConfig, JSON.stringify(config, null, 2));
      wroteTempConfig = true;
      console.log(`Using temporary repomix.config.json in ${targetDir}`);
    }

    await new Promise((resolve, reject) => {
      const child = spawn("npx", ["--yes", "repomix"], {
        stdio: "inherit",
        shell: process.platform === "win32",
        cwd: targetDir,
      });
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`npx exited with code ${code}`)),
      );
    });
    console.log(`REPOMIX.md written to ${outputFile}`);
    // Clean up temporary config if created
    if (fs.existsSync(path.join(targetDir, "repomix.config.json"))) {
      // Only remove if we created it
      // (We didn't persist a marker; best-effort: remove when CWD is ./autoforge defaulting to parent and no explicit arg provided.)
      if (!targetArg && path.basename(cwd).toLowerCase() === "autoforge") {
        try {
          fs.unlinkSync(path.join(targetDir, "repomix.config.json"));
        } catch {}
      }
    }
  } catch (err) {
    console.error("Failed to generate REPOMIX.md:", err.message);
    console.error(
      "Hint: run `npm install` to ensure devDependencies are available.",
    );
    process.exit(1);
  }
}

main();
