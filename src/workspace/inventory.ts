import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface ProjectInventory {
  root: string;
  files: number;
  directories: number;
  categories: Record<string, number>;
  highlights: string[];
}

export interface ProjectSummary {
  activeWork: { kind: string; id: string } | null;
  work: { features: number; phases: number; tasks: number; issues: number };
  decisions: number;
  designs: number;
  planningFiles: number;
}

export async function inspectProjectSummary(
  projectRoot: string,
): Promise<ProjectSummary> {
  const root = path.resolve(projectRoot);
  const work = await readJson(path.join(root, ".autoforge/state/work.json"));
  const decisions = await readJson(
    path.join(root, ".autoforge/state/decisions.json"),
  );
  const inventory = await inspectProjectInventory(root);
  const designInventory = await countFiles(
    path.join(root, ".autoforge/specifications"),
  );
  return {
    activeWork:
      work?.data?.activeWork &&
      typeof work.data.activeWork.kind === "string" &&
      typeof work.data.activeWork.id === "string"
        ? work.data.activeWork
        : null,
    work: {
      features: Array.isArray(work?.data?.features)
        ? work.data.features.length
        : 0,
      phases: Array.isArray(work?.data?.phases) ? work.data.phases.length : 0,
      tasks: Array.isArray(work?.data?.tasks) ? work.data.tasks.length : 0,
      issues: Array.isArray(work?.data?.issues) ? work.data.issues.length : 0,
    },
    decisions: Array.isArray(decisions?.data?.decisions)
      ? decisions.data.decisions.length
      : 0,
    designs: designInventory,
    planningFiles: inventory.categories.planning ?? 0,
  };
}

async function readJson(filePath: string): Promise<any | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

async function countFiles(directory: string): Promise<number> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      count += entry.isDirectory()
        ? await countFiles(path.join(directory, entry.name))
        : entry.isFile()
          ? 1
          : 0;
    }
    return count;
  } catch {
    return 0;
  }
}

const categoryRoots: Record<string, string[]> = {
  autoforge: [".autoforge"],
  documentation: ["README.md", "docs"],
  planning: ["dev"],
  source: ["src", "lib", "app"],
  tests: ["test", "tests"],
  workflows: [".github"],
};

export async function inspectProjectInventory(
  projectRoot: string,
  maxFiles = 2_000,
): Promise<ProjectInventory> {
  const root = path.resolve(projectRoot);
  const categories = Object.fromEntries(
    Object.keys(categoryRoots).map((category) => [category, 0]),
  );
  let files = 0;
  let directories = 0;
  const highlights: string[] = [];
  const visit = async (relativeDirectory: string): Promise<void> => {
    if (files >= maxFiles) return;
    const directory = path.join(root, relativeDirectory);
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    directories += 1;
    for (const entry of entries) {
      if (files >= maxFiles) break;
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        await visit(relativePath);
      } else if (entry.isFile()) {
        files += 1;
        for (const [category, roots] of Object.entries(categoryRoots)) {
          if (
            roots.some(
              (rootEntry) =>
                relativePath === rootEntry ||
                relativePath.startsWith(`${rootEntry}${path.sep}`),
            )
          ) {
            categories[category] = (categories[category] ?? 0) + 1;
          }
        }
        if (
          highlights.length < 20 &&
          /\.(md|mdx|yaml|yml|json)$/.test(entry.name)
        ) {
          highlights.push(relativePath);
        }
      }
    }
  };
  await visit("");
  return { root, files, directories, categories, highlights };
}
