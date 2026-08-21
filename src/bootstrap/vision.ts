import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BootstrapDiscovery } from "./discovery.js";

export async function generateVisionDocument(
  projectRoot: string,
): Promise<string> {
  const discoveryPath = path.join(
    path.resolve(projectRoot),
    ".autoforge",
    "bootstrap",
    "discovery.json",
  );
  const discovery = JSON.parse(
    await readFile(discoveryPath, "utf8"),
  ) as BootstrapDiscovery;
  if (discovery.approved !== true) {
    throw new Error("Approved discovery input is required.");
  }
  const visionPath = path.join(path.resolve(projectRoot), "VISION.md");
  const content = `# Vision\n\n## Purpose\n${discovery.vision}\n\n## Problem\n${discovery.problem}\n\n## Target Users\n${discovery.users.map((user) => `- ${user}`).join("\n")}\n\n## Initial Use Cases\n${discovery.useCases.map((useCase) => `- ${useCase}`).join("\n")}\n\n## Non-Goals\n\n- To be defined through continued discovery.\n`;
  await writeFile(visionPath, content, { encoding: "utf8", flag: "wx" });
  return visionPath;
}

export async function amendVisionDocument(
  projectRoot: string,
  sourcePath: string,
): Promise<string> {
  const visionPath = path.join(path.resolve(projectRoot), "VISION.md");
  const existing = await readFile(visionPath, "utf8");
  const discovery = JSON.parse(
    await readFile(path.resolve(sourcePath), "utf8"),
  ) as BootstrapDiscovery;
  if (discovery.approved !== true) {
    throw new Error("Approved discovery input is required.");
  }
  const amendment = `\n## Approved Vision Amendment\n\n### Purpose Update\n${discovery.vision}\n\n### Problem Update\n${discovery.problem}\n\n### Affected Users\n${discovery.users.map((user) => `- ${user}`).join("\n")}\n\n### New Use Cases\n${discovery.useCases.map((useCase) => `- ${useCase}`).join("\n")}\n`;
  await writeFile(visionPath, `${existing.trimEnd()}\n${amendment}`, "utf8");
  return visionPath;
}
