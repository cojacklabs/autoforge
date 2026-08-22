import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface ProjectStorageReport {
  projectPath: string;
  autoforgePath: string;
  exists: boolean;
  bytes: number;
  files: number;
}

export async function inspectProjectStorage(
  projectRoot: string,
): Promise<ProjectStorageReport> {
  const autoforgePath = path.join(path.resolve(projectRoot), ".autoforge");
  const summary = await walk(autoforgePath);
  return {
    projectPath: path.resolve(projectRoot),
    autoforgePath,
    exists: summary.exists,
    bytes: summary.bytes,
    files: summary.files,
  };
}

async function walk(
  directory: string,
): Promise<Pick<ProjectStorageReport, "exists" | "bytes" | "files">> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    let bytes = 0;
    let files = 0;
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const nested = await walk(entryPath);
        bytes += nested.bytes;
        files += nested.files;
      } else if (entry.isFile()) {
        bytes += (await stat(entryPath)).size;
        files += 1;
      }
    }
    return { exists: true, bytes, files };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { exists: false, bytes: 0, files: 0 };
    }
    throw error;
  }
}
