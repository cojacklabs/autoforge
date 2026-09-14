import {
  projectArtifactSchema,
  type ProjectArtifact,
} from "@cojacklabs/autoforge-protocol";
import type { Clock } from "./ports.js";

export interface ProjectArtifactRepository {
  read(id: string): Promise<ProjectArtifact | null>;
  list(): Promise<ProjectArtifact[]>;
  writeAll(artifacts: ProjectArtifact[]): Promise<string>;
}
type NewArtifact = Omit<
  ProjectArtifact,
  "schemaVersion" | "status" | "approval" | "createdAt" | "supersedes"
>;

export class ProjectArtifactService {
  constructor(
    private readonly repository: ProjectArtifactRepository,
    private readonly clock: Clock = { now: () => new Date() },
  ) {}
  async create(input: NewArtifact) {
    if (await this.repository.read(input.id))
      throw new Error(`Artifact already exists: ${input.id}`);
    const artifact = projectArtifactSchema.parse({
      ...input,
      schemaVersion: "1",
      status: "draft",
      approval: null,
      supersedes: null,
      createdAt: this.clock.now().toISOString(),
    });
    return {
      artifact,
      location: await this.repository.writeAll([
        ...(await this.repository.list()),
        artifact,
      ]),
    };
  }
  async approve(id: string, approvedBy: string) {
    const all = await this.repository.list();
    const current = all.find((item) => item.id === id);
    if (!current) throw new Error(`Unknown artifact: ${id}`);
    if (current.status !== "draft")
      throw new Error(`Only draft artifacts may be approved: ${id}`);
    const artifact = projectArtifactSchema.parse({
      ...current,
      status: "approved",
      approval: { approvedBy, approvedAt: this.clock.now().toISOString() },
    });
    return {
      artifact,
      location: await this.repository.writeAll(
        all.map((item) => (item.id === id ? artifact : item)),
      ),
    };
  }
  async supersede(id: string, input: NewArtifact) {
    const all = await this.repository.list();
    const current = all.find((item) => item.id === id);
    if (!current || current.status !== "approved")
      throw new Error(`Only approved artifacts may be superseded: ${id}`);
    if (all.some((item) => item.id === input.id))
      throw new Error(`Artifact already exists: ${input.id}`);
    const prior = projectArtifactSchema.parse({
      ...current,
      status: "superseded",
    });
    const artifact = projectArtifactSchema.parse({
      ...input,
      schemaVersion: "1",
      status: "draft",
      approval: null,
      supersedes: id,
      createdAt: this.clock.now().toISOString(),
    });
    return {
      artifact,
      location: await this.repository.writeAll([
        ...all.filter((item) => item.id !== id),
        prior,
        artifact,
      ]),
    };
  }
}
