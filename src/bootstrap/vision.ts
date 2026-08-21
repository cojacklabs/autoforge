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
