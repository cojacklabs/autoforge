import { existsSync } from "node:fs";
import path from "node:path";

import { FRAMEWORK_IDENTITY, type StateDirectory } from "./vocabularies.js";

/**
 * Resolves which framework state directory a base directory uses.
 *
 * During the AutoForge to Priozar compatibility window both names are valid.
 * The canonical `.priozar` directory wins when present; otherwise the legacy
 * `.autoforge` name is used, including when neither exists yet so that new
 * state keeps landing where the installed CLI already reads it.
 *
 * The check is synchronous and cheap because it runs while building default
 * store paths, where callers cannot await.
 */
export function resolveStateDirectoryName(
  baseDirectory: string,
): StateDirectory {
  const canonical = FRAMEWORK_IDENTITY.successor.stateDirectory;
  return existsSync(path.join(baseDirectory, canonical))
    ? canonical
    : FRAMEWORK_IDENTITY.current.stateDirectory;
}

/** Absolute path of the active state directory under `baseDirectory`. */
export function resolveStateDirectoryPath(baseDirectory: string): string {
  return path.join(baseDirectory, resolveStateDirectoryName(baseDirectory));
}

/**
 * Maps a normalized project-relative path that begins with the legacy
 * `.autoforge` segment onto the active state directory.
 *
 * Many modules express state locations as `.autoforge/...` constants. Mapping
 * here lets them follow a migrated project without each constant changing. Only
 * a whole leading segment is rewritten, so `.autoforge-notes/` and nested
 * `src/.autoforge/` paths are left alone.
 */
export function mapLegacyStatePath(
  projectRoot: string,
  normalizedRelativePath: string,
): string {
  const legacy = FRAMEWORK_IDENTITY.current.stateDirectory;
  const isLegacy =
    normalizedRelativePath === legacy ||
    normalizedRelativePath.startsWith(`${legacy}/`);
  if (!isLegacy) {
    return normalizedRelativePath;
  }
  const active = resolveStateDirectoryName(projectRoot);
  return active === legacy
    ? normalizedRelativePath
    : `${active}${normalizedRelativePath.slice(legacy.length)}`;
}
