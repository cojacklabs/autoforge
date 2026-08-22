import { readdir } from "node:fs/promises";
import path from "node:path";

export interface ProjectInventory {
  root: string;
  files: number;
  directories: number;
  categories: Record<string, number>;
  highlights: string[];
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
