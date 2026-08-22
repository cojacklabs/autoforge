import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import {
  parseSpecificationMarkdown,
  serializeSpecificationMarkdown,
} from "./codec.js";
import {
  SPECIFICATION_TYPES,
  specificationIdSchema,
  specificationSchema,
  type Specification,
} from "./schemas.js";

export const DEFAULT_SPECIFICATION_DIRECTORY = ".autoforge/specifications";

export interface SpecificationFileStoreOptions {
  rootDirectory?: string;
  temporaryId?: () => string;
}

function specificationError(
  code:
    | "FILESYSTEM_ERROR"
    | "INVALID_ARGUMENT"
    | "INVALID_STATE"
    | "STATE_CONFLICT",
  message: string,
  details: Readonly<Record<string, unknown>>,
  cause?: unknown,
): AutoForgeError {
  return new AutoForgeError(code, message, {
    cause,
    details,
    exitCode:
      code === "STATE_CONFLICT"
        ? EXIT_CODE.conflict
        : code === "FILESYSTEM_ERROR"
          ? EXIT_CODE.filesystem
          : code === "INVALID_ARGUMENT"
            ? EXIT_CODE.notFound
            : EXIT_CODE.invalidState,
  });
}

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await lstat(candidatePath);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export class SpecificationFileStore {
  private readonly projectRoot: string;
  private readonly rootDirectory: string;
  private readonly temporaryId: () => string;

  constructor(
    projectRoot: string,
    options: SpecificationFileStoreOptions = {},
  ) {
    this.projectRoot = projectRoot;
    this.rootDirectory =
      options.rootDirectory ?? DEFAULT_SPECIFICATION_DIRECTORY;
    this.temporaryId =
      options.temporaryId ??
      (() =>
        `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  async create(specification: Specification): Promise<string> {
    await this.assertInitialized();
    const result = specificationSchema.safeParse(specification);
    if (!result.success) {
      throw specificationError("INVALID_ARGUMENT", "Invalid specification", {
        issues: result.error.issues,
      });
    }
    const validated = result.data;
    const relativePath = this.relativePath(validated.id);
    const destinationPath = await this.resolve(relativePath);
    const lockPath = `${destinationPath}.lock`;
    const temporaryPath = `${destinationPath}.${this.temporaryId()}.tmp`;
    await mkdir(path.dirname(destinationPath), { recursive: true });

    let lockHandle: FileHandle | undefined;
    try {
      try {
        lockHandle = await open(lockPath, "wx");
        await lockHandle.writeFile(`${process.pid}\n`, "utf8");
        await lockHandle.sync();
      } catch (error) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "EEXIST"
        )) {
          throw specificationError(
            "FILESYSTEM_ERROR",
            `Unable to lock specification ${validated.id}`,
            { id: validated.id, path: relativePath },
            error,
          );
        }
        throw specificationError(
          "STATE_CONFLICT",
          `Specification ${validated.id} is locked`,
          { id: validated.id, path: relativePath },
          error,
        );
      }
      if (await pathExists(destinationPath)) {
        throw specificationError(
          "STATE_CONFLICT",
          `Specification ${validated.id} is already registered`,
          { id: validated.id, path: relativePath },
        );
      }
      const temporaryHandle = await open(temporaryPath, "wx");
      try {
        await temporaryHandle.writeFile(
          serializeSpecificationMarkdown(validated),
          "utf8",
        );
        await temporaryHandle.sync();
      } finally {
        await temporaryHandle.close();
      }
      await rename(temporaryPath, destinationPath);
      return relativePath;
    } finally {
      await rm(temporaryPath, { force: true });
      if (lockHandle) {
        try {
          await lockHandle.close();
        } finally {
          await rm(lockPath, { force: true });
        }
      }
    }
  }

  async update(specification: Specification): Promise<string> {
    await this.assertInitialized();
    const validated = specificationSchema.parse(specification);
    const relativePath = this.relativePath(validated.id);
    const destinationPath = await this.resolve(relativePath);
    if (!(await pathExists(destinationPath))) {
      throw specificationError(
        "INVALID_ARGUMENT",
        `Specification ${validated.id} is not registered`,
        {
          id: validated.id,
          path: relativePath,
        },
      );
    }
    const temporaryPath = `${destinationPath}.${this.temporaryId()}.tmp`;
    await mkdir(path.dirname(destinationPath), { recursive: true });
    try {
      await writeFile(
        temporaryPath,
        serializeSpecificationMarkdown(validated),
        "utf8",
      );
      await rename(temporaryPath, destinationPath);
      return relativePath;
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  async read(id: string): Promise<Specification> {
    await this.assertInitialized();
    const idResult = specificationIdSchema.safeParse(id);
    if (!idResult.success) {
      throw specificationError(
        "INVALID_ARGUMENT",
        `Invalid specification ID ${id}`,
        { id, issues: idResult.error.issues },
      );
    }
    const validatedId = idResult.data;
    const relativePath = this.relativePath(validatedId);
    const filePath = await this.resolve(relativePath);
    let markdown: string;
    try {
      markdown = await readFile(filePath, "utf8");
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw specificationError(
          "INVALID_ARGUMENT",
          `Unknown specification ${validatedId}`,
          { id: validatedId, path: relativePath },
          error,
        );
      }
      throw error;
    }
    const specification = parseSpecificationMarkdown(markdown, relativePath);
    if (specification.id !== validatedId) {
      throw specificationError(
        "INVALID_STATE",
        `Specification identity does not match ${relativePath}`,
        {
          expectedId: validatedId,
          actualId: specification.id,
          path: relativePath,
        },
      );
    }
    return specification;
  }

  async list(): Promise<Specification[]> {
    await this.assertInitialized();
    const specifications: Specification[] = [];
    for (const type of SPECIFICATION_TYPES) {
      const typeDirectory = await this.resolve(`${this.rootDirectory}/${type}`);
      let entries;
      try {
        entries = await readdir(typeDirectory, { withFileTypes: true });
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
        if (
          (!entry.isFile() && !entry.isSymbolicLink()) ||
          !entry.name.endsWith(".md")
        ) {
          continue;
        }
        const id = `${type}.${entry.name.slice(0, -3)}`;
        const idResult = specificationIdSchema.safeParse(id);
        if (!idResult.success) {
          throw specificationError(
            "INVALID_STATE",
            `Invalid specification filename ${entry.name}`,
            {
              path: `${this.rootDirectory}/${type}/${entry.name}`,
              issues: idResult.error.issues,
            },
          );
        }
        specifications.push(await this.read(idResult.data));
      }
    }
    return specifications.sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  private relativePath(id: string): string {
    const separator = id.indexOf(".");
    const type = id.slice(0, separator);
    const name = id.slice(separator + 1);
    return `${this.rootDirectory}/${type}/${name}.md`;
  }

  private async resolve(projectRelativePath: string): Promise<string> {
    return (
      await resolveContainedProjectPath(this.projectRoot, projectRelativePath)
    ).absolutePath;
  }

  private async assertInitialized(): Promise<void> {
    const configPath = await this.resolve(".autoforge/config.json");
    if (!(await pathExists(configPath))) {
      throw specificationError(
        "INVALID_STATE",
        "Specification storage requires an initialized AutoForge project",
        { path: ".autoforge/config.json" },
      );
    }
  }
}
