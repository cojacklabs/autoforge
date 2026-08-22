import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

export const storageManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectId: z.string().regex(/^project\.[a-f0-9]{16}$/),
    canonicalPath: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type StorageManifest = z.infer<typeof storageManifestSchema>;
export type StorageTier =
  "metadata" | "active" | "history" | "artifacts" | "cache";

export function projectStorageId(canonicalPath: string): string {
  return `project.${createHash("sha256").update(path.resolve(canonicalPath)).digest("hex").slice(0, 16)}`;
}

export function projectStorageDirectory(
  canonicalPath: string,
  homeDirectory = os.homedir(),
): string {
  return path.join(
    homeDirectory,
    ".autoforge",
    "projects",
    projectStorageId(canonicalPath),
  );
}

export function projectStorageTierPath(
  canonicalPath: string,
  tier: StorageTier,
  homeDirectory?: string,
): string {
  return path.join(projectStorageDirectory(canonicalPath, homeDirectory), tier);
}

export class StorageManifestStore {
  private readonly manifestPath: string;
  private readonly canonicalPath: string;
  private readonly projectId: string;

  constructor(canonicalPath: string, homeDirectory?: string) {
    this.canonicalPath = path.resolve(canonicalPath);
    this.projectId = projectStorageId(this.canonicalPath);
    this.manifestPath = path.join(
      projectStorageTierPath(this.canonicalPath, "metadata", homeDirectory),
      "manifest.json",
    );
  }

  async read(): Promise<StorageManifest | null> {
    try {
      return storageManifestSchema.parse(
        JSON.parse(await readFile(this.manifestPath, "utf8")),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }
      throw error;
    }
  }

  async write(now = new Date()): Promise<StorageManifest> {
    const current = await this.read();
    const manifest = storageManifestSchema.parse({
      schemaVersion: 1,
      projectId: this.projectId,
      canonicalPath: current?.canonicalPath ?? this.canonicalPath,
      createdAt: current?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    });
    await mkdir(path.dirname(this.manifestPath), { recursive: true });
    const temporary = `${this.manifestPath}.${process.pid}.tmp`;
    await writeFile(
      temporary,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    await rename(temporary, this.manifestPath);
    return manifest;
  }
}
