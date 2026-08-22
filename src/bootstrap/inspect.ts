import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { discoverProjectRoot, type ProjectMarker } from "../core/project.js";
import { inspectInstallation } from "../commands/init.js";
import { BOOTSTRAP_ARTIFACT_IDS, bootstrapManifestSchema } from "./manifest.js";

export interface BootstrapReport {
  projectRoot: string;
  marker: ProjectMarker | "none";
  installation: "absent" | "current" | "legacy" | "partial";
  manifests: string[];
  projectTypes: string[];
  nextAction: "initialize" | "migrate" | "repair" | "ready";
  legacyInventory: string[];
  migrationPlan: {
    status: "not-applicable" | "available" | "review-required";
    reason?: string;
  };
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
  const legacyInventory =
    installation.status === "legacy"
      ? await listLegacyFiles(installation.directory)
      : [];
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
    legacyInventory,
    migrationPlan:
      installation.status !== "legacy"
        ? { status: "not-applicable" }
        : legacyInventory.includes("package.json")
          ? { status: "available" }
          : {
              status: "review-required",
              reason:
                "Legacy package metadata is missing; manual review is required.",
            },
  };
}

async function listLegacyFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(candidate);
      else if (entry.isFile()) files.push(path.relative(directory, candidate));
    }
  }
  await walk(directory);
  return files.sort();
}

export async function scaffoldBootstrapManifest(
  projectRoot: string,
): Promise<string> {
  const manifestPath = path.join(
    path.resolve(projectRoot),
    ".autoforge",
    "bootstrap",
    "manifest.json",
  );
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const report = await inspectBootstrap(projectRoot);
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      bootstrapManifestSchema.parse({
        version: "0.12.0",
        report,
        artifacts: BOOTSTRAP_ARTIFACT_IDS.map((id) => ({
          id,
          status: "planned",
        })),
      }),
      null,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  return manifestPath;
}
