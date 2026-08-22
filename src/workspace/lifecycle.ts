import type { ProjectMetadata } from "./global-store.js";

const readOnlyCommands = new Set([
  "help",
  "version",
  "doctor",
  "projects",
  "assets",
  "agents",
  "bootstrap",
  "twin",
  "evidence",
]);

export function projectMutationBlocked(
  command: string | undefined,
  metadata: ProjectMetadata | undefined,
): boolean {
  if (!metadata || metadata.lifecycle === "active" || !command) return false;
  return !readOnlyCommands.has(command);
}
