#!/usr/bin/env node

/**
 * Build script for packaging AutoForge.
 *
 * Uses a whitelist approach to copy only essential framework files and directories
 * into dist/ so the npm package ships only what end users need.
 *
 * Included:
 * - ai/ (prompts, configurations, templates)
 * - bin/ (CLI commands)
 * - examples/ (example projects for users)
 * - scripts/ (build and utility scripts)
 * - api/ (API specifications)
 * - change_requests/, devops/, diagrams/, ideas/, qa/, research/, security/, shared/, tests/ (optional supportive dirs)
 * - docs/ (only user-facing documentation - excludes release prep docs)
 * - Root files: config templates, README, LICENSE, community guidelines, CHANGELOG
 *
 * Excluded (internal/framework-only):
 * - .claude/ (Claude Code configuration)
 * - .github/ (GitHub workflows)
 * - ref/ (internal reference materials)
 * - Build artifacts: .git, dist, node_modules
 * - Framework release docs: RELEASE_*.md, AUTOFORGE.md, CHANGES_COMPLETE.md, V030_RELEASE_INDEX.md
 */

import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");

/**
 * Directories to include in the distribution
 */
const INCLUDE_DIRS = new Set([
  "ai",
  "bin",
  "scripts",
  "api",
  "change_requests",
  "devops",
  "diagrams",
  "ideas",
  "qa",
  "research",
  "security",
  "shared",
  "tests",
  "docs",
]);

/**
 * Directories to always exclude (internal/build artifacts)
 */
const EXCLUDE_DIRS = new Set([
  ".claude",
  ".github",
  ".git",
  "dist",
  "node_modules",
  "ref",
]);

/**
 * Root-level files to include
 */
const INCLUDE_ROOT_FILES = new Set([
  "autoforge.config.json",
  "repomix.config.json",
  "package.json",
  "README.md",
  "LICENSE",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  ".gitignore",
]);

/**
 * Root-level files to exclude (framework-specific, not for users)
 */
const EXCLUDE_ROOT_FILES = new Set([
  "RELEASE_PREP_COMPLETE.md",
  "RELEASE_SUMMARY.txt",
  "V030_RELEASE_INDEX.md",
  "AUTOFORGE.md",
  "CHANGES_COMPLETE.md",
  "REPO.md",
  "bun.lock",
  "package-lock.json",
  ".DS_Store",
]);

/**
 * Files within docs/ to exclude (internal framework docs, not user-facing)
 */
const EXCLUDE_DOCS_FILES = new Set([
  "DOCUMENTATION_STANDARDIZATION.md",
  "V030_RELEASE_CHECKLIST.md",
  "README_UPDATES.txt",
  "AUTOFORGE_META_PROMPTS.md",
  "AUTOFORGE_RECIPES.md",
  "AUTOFORGE_VISION.md",
]);

/**
 * Paths to always skip (build-time artifacts, logs, caches)
 */
const ALWAYS_SKIP_PATHS = new Set([
  "ai/logs",
  "ai/reports",
  ".cache",
]);

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function shouldIncludeRootEntry(entry) {
  // Skip hidden files/dirs except .gitignore
  if (entry.startsWith(".") && entry !== ".gitignore") {
    return false;
  }

  // Check exclusion lists
  if (EXCLUDE_DIRS.has(entry) || EXCLUDE_ROOT_FILES.has(entry)) {
    return false;
  }

  // Check inclusion list
  return INCLUDE_DIRS.has(entry) || INCLUDE_ROOT_FILES.has(entry);
}

function shouldIncludeFilePath(src, repoRoot) {
  const rel = path.relative(repoRoot, src);
  const base = path.basename(rel);
  if (base === '.DS_Store' || base === '.gitignore') {
    return false;
  }

  // Always skip certain paths
  for (const skip of ALWAYS_SKIP_PATHS) {
    if (rel.includes(skip)) {
      return false;
    }
  }

  // Special handling for docs/ files
  if (rel.startsWith("docs/")) {
    // Exclude development-only docs directory from distribution
    if (rel.startsWith("docs/dev/")) {
      return false;
    }
    const filename = path.basename(rel);
    if (EXCLUDE_DOCS_FILES.has(filename)) {
      return false;
    }
  }

  return true;
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  console.log("📦 Building AutoForge distribution with whitelist approach...");

  const entries = await readdir(repoRoot);
  let copiedCount = 0;
  let skippedCount = 0;

  for (const entry of entries) {
    if (!shouldIncludeRootEntry(entry)) {
      skippedCount++;
      continue;
    }

    const srcPath = path.join(repoRoot, entry);
    const destPath = path.join(distDir, entry);

    try {
      const stats = await stat(srcPath);
      if (stats.isDirectory()) {
        await cp(srcPath, destPath, {
          recursive: true,
          filter: (src) => shouldIncludeFilePath(src, repoRoot),
        });
        copiedCount++;
      } else {
        await cp(srcPath, destPath);
        copiedCount++;
      }
    } catch (err) {
      console.warn(`⚠️  Failed to copy ${entry}: ${err.message}`);
      skippedCount++;
    }
  }

  // Cleanup: ensure docs/dev is not included in dist, even as an empty directory
  try {
    const devDocs = path.join(distDir, "docs", "dev");
    await rm(devDocs, { recursive: true, force: true });
  } catch {}

  // Cleanup: remove root .gitignore if present
  try {
    await rm(path.join(distDir, '.gitignore'), { force: true });
  } catch {}

  console.log(`✅ Built AutoForge distribution in ${distDir}`);
  console.log(`   - Included: ${copiedCount} entries`);
  console.log(`   - Skipped: ${skippedCount} entries`);
}

build().catch((err) => {
  console.error("Failed to build dist:", err);
  process.exit(1);
});
