import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const discoverySchema = z
  .object({
    approved: z.literal(true),
    vision: z.string().trim().min(1),
    problem: z.string().trim().min(1),
    users: z.array(z.string().trim().min(1)).min(1),
    useCases: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export type BootstrapDiscovery = z.infer<typeof discoverySchema>;

export async function recordBootstrapDiscovery(
  projectRoot: string,
  sourcePath: string,
): Promise<string> {
  const discovery = discoverySchema.parse(
    JSON.parse(await readFile(path.resolve(sourcePath), "utf8")),
  );
  const outputPath = path.join(
    path.resolve(projectRoot),
    ".autoforge",
    "bootstrap",
    "discovery.json",
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(discovery, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return outputPath;
}
