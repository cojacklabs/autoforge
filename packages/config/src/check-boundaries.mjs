import { builtinModules } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../../..");
const INTERNAL_PREFIX = "@cojacklabs/autoforge";
const BUILTIN_MODULES = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

const packagePolicy = new Map([
  ["packages/protocol", { name: `${INTERNAL_PREFIX}-protocol`, allow: [] }],
  [
    "packages/core",
    { name: `${INTERNAL_PREFIX}-core`, allow: [`${INTERNAL_PREFIX}-protocol`] },
  ],
  [
    "packages/sdk",
    {
      name: `${INTERNAL_PREFIX}-sdk`,
      allow: [`${INTERNAL_PREFIX}-core`, `${INTERNAL_PREFIX}-protocol`],
    },
  ],
  [
    "packages/providers",
    {
      name: `${INTERNAL_PREFIX}-providers`,
      allow: [`${INTERNAL_PREFIX}-protocol`],
    },
  ],
  [
    "packages/client",
    {
      name: `${INTERNAL_PREFIX}-client`,
      allow: [`${INTERNAL_PREFIX}-protocol`],
    },
  ],
  [
    "packages/config",
    { name: `${INTERNAL_PREFIX}-config`, allow: [], private: true },
  ],
  [
    "apps/core-cli",
    {
      name: INTERNAL_PREFIX,
      allow: [
        `${INTERNAL_PREFIX}-protocol`,
        `${INTERNAL_PREFIX}-core`,
        `${INTERNAL_PREFIX}-sdk`,
        `${INTERNAL_PREFIX}-config`,
      ],
    },
  ],
  [
    "apps/agent-cli",
    {
      name: `${INTERNAL_PREFIX}-agent`,
      allow: [
        `${INTERNAL_PREFIX}-protocol`,
        `${INTERNAL_PREFIX}-sdk`,
        `${INTERNAL_PREFIX}-providers`,
        `${INTERNAL_PREFIX}-client`,
        `${INTERNAL_PREFIX}-config`,
      ],
    },
  ],
  [
    "apps/web",
    {
      name: `${INTERNAL_PREFIX}-web`,
      allow: [
        `${INTERNAL_PREFIX}-protocol`,
        `${INTERNAL_PREFIX}-client`,
        `${INTERNAL_PREFIX}-config`,
      ],
      private: true,
    },
  ],
  [
    "apps/service",
    {
      name: `${INTERNAL_PREFIX}-service`,
      allow: [
        `${INTERNAL_PREFIX}-protocol`,
        `${INTERNAL_PREFIX}-core`,
        `${INTERNAL_PREFIX}-sdk`,
        `${INTERNAL_PREFIX}-providers`,
        `${INTERNAL_PREFIX}-config`,
      ],
      private: true,
    },
  ],
]);

async function workspaceManifests() {
  const rootManifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const manifests = [{ workspace: "apps/core-cli", manifest: rootManifest }];
  for (const parent of ["apps", "packages"]) {
    let entries = [];
    try {
      entries = await readdir(path.join(root, parent), { withFileTypes: true });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const workspace = `${parent}/${entry.name}`;
      const manifestPath = path.join(root, workspace, "package.json");
      try {
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        manifests.push({ workspace, manifest });
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          continue;
        }
        throw error;
      }
    }
  }
  return manifests;
}

function internalDependencies(manifest) {
  const sections = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
  ];
  return [
    ...new Set(
      sections.flatMap((section) =>
        Object.keys(section ?? {}).filter(
          (name) =>
            name === INTERNAL_PREFIX || name.startsWith(`${INTERNAL_PREFIX}-`),
        ),
      ),
    ),
  ].sort();
}

function declaredDependencies(manifest) {
  return new Set(
    [
      manifest.dependencies,
      manifest.devDependencies,
      manifest.optionalDependencies,
      manifest.peerDependencies,
    ].flatMap((section) => Object.keys(section ?? {})),
  );
}

function packageName(specifier) {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    BUILTIN_MODULES.has(specifier)
  ) {
    return null;
  }
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function importedPackages(source) {
  const packages = new Set();
  const expression =
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(expression)) {
    const name = packageName(match[1] ?? match[2] ?? match[3]);
    if (name) packages.add(name);
  }
  return packages;
}

async function sourceFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return files;
    }
    throw error;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(entryPath)));
    else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name))
      files.push(entryPath);
  }
  return files;
}

async function sourceRoots(workspace) {
  return workspace === "apps/core-cli"
    ? [path.join(root, "apps/core-cli/src"), path.join(root, "src")]
    : [path.join(root, workspace, "src")];
}

function findCycle(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(node) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      return [...stack.slice(start), node];
    }
    if (visited.has(node)) return null;
    visiting.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

const errors = [];
const manifests = await workspaceManifests();
const knownNames = new Set(manifests.map(({ manifest }) => manifest.name));
const graph = new Map();

for (const { workspace, manifest } of manifests) {
  const policy = packagePolicy.get(workspace);
  if (!policy) {
    errors.push(`${workspace}: no package ownership policy is defined`);
    continue;
  }
  if (manifest.name !== policy.name) {
    errors.push(
      `${workspace}: expected package name ${policy.name}, found ${String(manifest.name)}`,
    );
  }
  if (policy.private === true && manifest.private !== true) {
    errors.push(`${workspace}: package must remain private`);
  }
  const dependencies = internalDependencies(manifest);
  const forbidden = dependencies.filter((name) => !policy.allow.includes(name));
  for (const name of forbidden) {
    errors.push(`${workspace}: dependency on ${name} is not allowed`);
  }
  graph.set(
    manifest.name,
    dependencies.filter((name) => knownNames.has(name)),
  );
  const declared = declaredDependencies(manifest);
  for (const sourceRoot of await sourceRoots(workspace)) {
    for (const file of await sourceFiles(sourceRoot)) {
      const imports = importedPackages(await readFile(file, "utf8"));
      for (const dependency of imports) {
        if (!declared.has(dependency)) {
          errors.push(
            `${path.relative(root, file)}: import ${dependency} is not declared by ${manifest.name}`,
          );
        }
      }
    }
  }
}

const cycle = findCycle(graph);
if (cycle) errors.push(`workspace dependency cycle: ${cycle.join(" -> ")}`);

if (errors.length > 0) {
  console.error("AutoForge package boundary violations:");
  for (const error of errors.sort()) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `AutoForge source and package boundaries pass (${manifests.length} workspaces).`,
  );
}
