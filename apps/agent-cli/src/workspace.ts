import {
  lstat,
  mkdir,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import type { AgentWorkspace } from "./session.js";

export class LocalAgentWorkspace implements AgentWorkspace {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  async write(relativePath: string, content: string): Promise<void> {
    const target = await this.resolveWritableTarget(relativePath);
    const temporary = `${target}.${process.pid}.${randomUUID()}.autoforge-agent.tmp`;
    try {
      await writeFile(temporary, content, { encoding: "utf8", flag: "wx" });
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  private async resolveWritableTarget(relativePath: string): Promise<string> {
    const lexicalTarget = path.resolve(this.projectRoot, relativePath);
    const lexicalRelative = path.relative(this.projectRoot, lexicalTarget);
    if (
      lexicalRelative === "" ||
      lexicalRelative.startsWith(`..${path.sep}`) ||
      lexicalRelative === ".." ||
      path.isAbsolute(lexicalRelative)
    ) {
      throw new Error(`Agent edit path escapes the project: ${relativePath}`);
    }

    const canonicalRoot = await realpath(this.projectRoot);
    let ancestor = path.dirname(lexicalTarget);
    const missingSegments: string[] = [];
    while (!(await pathExists(ancestor))) {
      missingSegments.unshift(path.basename(ancestor));
      const parent = path.dirname(ancestor);
      if (parent === ancestor) {
        throw new Error(`Agent edit path escapes the project: ${relativePath}`);
      }
      ancestor = parent;
    }

    const canonicalAncestor = await realpath(ancestor);
    if (!isContained(canonicalRoot, canonicalAncestor)) {
      throw new Error(`Agent edit path escapes the project: ${relativePath}`);
    }
    const canonicalParent = path.resolve(canonicalAncestor, ...missingSegments);
    if (!isContained(canonicalRoot, canonicalParent)) {
      throw new Error(`Agent edit path escapes the project: ${relativePath}`);
    }
    await mkdir(canonicalParent, { recursive: true });
    const verifiedParent = await realpath(canonicalParent);
    if (!isContained(canonicalRoot, verifiedParent)) {
      throw new Error(`Agent edit path escapes the project: ${relativePath}`);
    }
    return path.join(verifiedParent, path.basename(lexicalTarget));
  }
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
