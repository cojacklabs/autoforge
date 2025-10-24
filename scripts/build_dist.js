#!/usr/bin/env node

/**
 * Build script for packaging AutoForge.
 *
 * Copies the entire repository (minus excluded paths) into dist/ so the
 * npm package can ship the full framework snapshot without forcing callers to
 * clone the git repository.
 */

import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ignore from "ignore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");

async function createIgnoreMatcher() {
  const ig = ignore();
  // Always ignore a few build-time paths regardless of gitignore content.
  ig.add([".git", "dist", "node_modules", "ai/logs", "ai/reports"]);

  const gitignorePath = path.join(repoRoot, ".gitignore");
  try {
    const gitignoreContents = await readFile(gitignorePath, "utf8");
    ig.add(
      gitignoreContents
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#")),
    );
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return (relativePath) => {
    if (!relativePath) {
      return false;
    }
    const normalised = relativePath.split(path.sep).join("/");
    return ig.ignores(normalised);
  };
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const isExcluded = await createIgnoreMatcher();

  const entries = await readdir(repoRoot);
  for (const entry of entries) {
    if (entry === "" || entry === null) {
      continue;
    }
    if (isExcluded(entry)) {
      continue;
    }
    const srcPath = path.join(repoRoot, entry);
    const destPath = path.join(distDir, entry);
    await cp(srcPath, destPath, {
      recursive: true,
      filter: (src) => {
        const rel = path.relative(repoRoot, src);
        return !isExcluded(rel);
      },
    });
  }
  console.log(`✅ Built AutoForge distribution in ${distDir}`);
}

build().catch((err) => {
  console.error("Failed to build dist:", err);
  process.exit(1);
});
