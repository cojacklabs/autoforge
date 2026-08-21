import { access, readdir } from "node:fs/promises";
import path from "node:path";

import { discoverProjectRoot, type ProjectMarker } from "../core/project.js";
import { inspectInstallation } from "../commands/init.js";

export interface BootstrapReport {
  projectRoot: string;
  marker: ProjectMarker | "none";
  installation: "absent" | "current" | "legacy" | "partial";
  manifests: string[];
}

const MANIFESTS = [
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "*.sln",
] as const;

export async function inspectBootstrap(
  startDirectory: string,
): Promise<BootstrapReport> {
  let project: { path: string; marker: ProjectMarker | "none" };
  try {
    project = await discoverProjectRoot({ startDirectory });
  } catch {
    project = { path: path.resolve(startDirectory), marker: "none" };
  }
  const manifests: string[] = [];
  for (const manifest of MANIFESTS) {
    if (manifest === "*.sln") {
      const entries = await readdir(project.path, { withFileTypes: true });
      if (
        entries.some((entry) => entry.isFile() && entry.name.endsWith(".sln"))
      ) {
        manifests.push(manifest);
      }
      continue;
    }
    try {
      await access(path.join(project.path, manifest));
      manifests.push(manifest);
    } catch {
      // Manifest is not present.
    }
  }
  const installation = await inspectInstallation(project.path);
  return {
    projectRoot: project.path,
    marker: project.marker,
    installation: installation.status,
    manifests,
  };
}
