import { access, readdir } from "node:fs/promises";
import path from "node:path";

import { discoverProjectRoot, type ProjectMarker } from "../core/project.js";
import { inspectInstallation } from "../commands/init.js";

export interface BootstrapReport {
  projectRoot: string;
  marker: ProjectMarker | "none";
  installation: "absent" | "current" | "legacy" | "partial";
  manifests: string[];
  projectTypes: string[];
  nextAction: "initialize" | "migrate" | "repair" | "ready";
}

const MANIFESTS = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "Gemfile",
  "composer.json",
  "mix.exs",
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
  const projectTypes = [
    ...new Set(
      manifests.flatMap((manifest) => {
        if (["package.json"].includes(manifest)) return ["node"];
        if (["pyproject.toml", "requirements.txt"].includes(manifest))
          return ["python"];
        if (manifest === "Cargo.toml") return ["rust"];
        if (manifest === "go.mod") return ["go"];
        if (manifest === "pom.xml") return ["java"];
        if (manifest === "Gemfile") return ["ruby"];
        if (manifest === "composer.json") return ["php"];
        if (manifest === "mix.exs") return ["elixir"];
        if (manifest === "*.sln") return ["dotnet"];
        return [];
      }),
    ),
  ];
  const nextAction =
    installation.status === "absent"
      ? "initialize"
      : installation.status === "legacy"
        ? "migrate"
        : installation.status === "partial"
          ? "repair"
          : "ready";
  return {
    projectRoot: project.path,
    marker: project.marker,
    installation: installation.status,
    manifests,
    projectTypes,
    nextAction,
  };
}
