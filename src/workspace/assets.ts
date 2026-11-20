import { access } from "node:fs/promises";
import path from "node:path";

import { resolveStateDirectoryPath } from "../core/state-directory.js";
import { GlobalWorkspaceStore } from "./global-store.js";

export type GlobalAssetKind = "templates" | "doctrines";

export async function resolveWorkspaceAsset(
  projectRoot: string,
  kind: GlobalAssetKind,
  name: string,
  store = new GlobalWorkspaceStore(),
): Promise<string | undefined> {
  if (!name || name.includes("..") || path.isAbsolute(name)) {
    return undefined;
  }
  const projectAsset = path.join(
    resolveStateDirectoryPath(path.resolve(projectRoot)),
    kind,
    name,
  );
  try {
    await access(projectAsset);
    return projectAsset;
  } catch {
    const globalAsset = path.join(store.assetDirectory(kind), name);
    try {
      await access(globalAsset);
      return globalAsset;
    } catch {
      return undefined;
    }
  }
}
