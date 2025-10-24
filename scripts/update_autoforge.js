#!/usr/bin/env node

/**
 * AutoForge updater
 *
 * Fetches the latest changes from the remote repository, attempts a fast-forward
 * pull on the current branch, reinstalls dependencies, and runs the standard
 * validation checks. Intended to be executed via `npm run update`.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

const EXIT_ERROR = 1;

function fail(message, status = EXIT_ERROR) {
  console.error(`\n❗ ${message}`);
  process.exit(status);
}

function runCommand(label, command, args, options = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} exited with status ${result.status ?? "unknown"}`,
      result.status ?? EXIT_ERROR,
    );
  }
  return result;
}

function runCommandCapture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} exited with status ${result.status ?? "unknown"}`,
      result.status ?? EXIT_ERROR,
    );
  }
  return result.stdout.trim();
}

if (!existsSync(".git")) {
  fail(
    "No .git directory found. Run this command from the root of the AutoForge repository.",
  );
}

const statusOutput = runCommandCapture("git", ["status", "--porcelain"]);
const hasDirtyState = statusOutput.length > 0;
let stashed = false;
let stashMarker = "";

if (hasDirtyState) {
  const timestamp = new Date().toISOString();
  stashMarker = `autoforge-update-${timestamp}`;
  console.log(
    `\nℹ Detected local changes. Stashing them under '${stashMarker}' before updating.`,
  );
  runCommand("Stashing local changes", "git", [
    "stash",
    "push",
    "--include-untracked",
    "--message",
    stashMarker,
  ]);
  stashed = true;
}

const currentBranch =
  runCommandCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]) || "main";

runCommand("Fetching latest AutoForge updates", "git", ["fetch", "origin"]);
runCommand(`Fast-forwarding ${currentBranch}`, "git", [
  "pull",
  "--ff-only",
  "origin",
  currentBranch,
]);
runCommand("Reinstalling dependencies", "npm", ["install"]);
runCommand("Validating guardrails", "npm", ["run", "validate"]);

if (stashed) {
  console.log("\nℹ Restoring stashed changes.");
  const popResult = spawnSync("git", ["stash", "pop"]);
  if (popResult.status !== 0) {
    console.error(popResult.stdout?.toString() ?? "");
    console.error(popResult.stderr?.toString() ?? "");
    fail(
      "AutoForge updated, but local changes could not be automatically re-applied. Resolve conflicts, then run `git stash pop` manually to reapply or recover your stash.",
    );
  }
  console.log("✅ Local changes successfully restored.");
}

console.log(
  "\n✅ AutoForge update complete. Review ai/memory to capture any notable changes.",
);
