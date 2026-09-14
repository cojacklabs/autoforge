import { ProjectArtifactService } from "@cojacklabs/autoforge-core";
import type { ProjectArtifact } from "@cojacklabs/autoforge-protocol";
import { computeCurrentRevision } from "../quality/scope.js";
import { createWorkStateStore } from "../state/kernel.js";
import { FileProjectArtifactRepository } from "./store.js";

export async function activeArtifactWorkId(
  projectRoot: string,
): Promise<string | null> {
  const { state } = await createWorkStateStore(projectRoot).read();
  return state.data.activeWork?.id ?? null;
}

export async function registerArtifactReference(
  projectRoot: string,
  input: {
    id: string;
    kind: ProjectArtifact["kind"];
    title: string;
    agentId: string;
    workId: string;
    path: string;
    createdAt?: string;
    revision?: { sha: string; worktreeFingerprint?: string };
  },
): Promise<void> {
  const repository = new FileProjectArtifactRepository(projectRoot);
  if (await repository.read(input.id)) return;
  const revision =
    input.revision ?? (await computeCurrentRevision(projectRoot));
  if (!revision) return;
  await new ProjectArtifactService(
    repository,
    input.createdAt ? { now: () => new Date(input.createdAt!) } : undefined,
  ).create({
    id: input.id,
    kind: input.kind,
    title: input.title,
    agentId: input.agentId,
    workId: input.workId,
    sourceRevision: {
      gitHead: revision.sha,
      dirtyFingerprint: revision.worktreeFingerprint ?? null,
    },
    content: { type: "reference", path: input.path },
  });
}
