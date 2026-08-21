import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  getWorkflowDefinition,
  workflowKindSchema,
  type WorkflowKind,
} from "./definitions.js";

export const workflowRunSchema = z
  .object({
    id: z.string().min(1),
    kind: workflowKindSchema,
    currentStage: z.string().min(1),
    completedStages: z.array(z.string()),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export class WorkflowStateStore {
  private readonly directory: string;

  constructor(projectRoot: string) {
    this.directory = path.join(projectRoot, ".autoforge", "workflows");
  }

  private filePath(id: string): string {
    return path.join(this.directory, `${id}.json`);
  }

  async create(
    id: string,
    kind: WorkflowKind,
    now = new Date(),
  ): Promise<WorkflowRun> {
    const first = getWorkflowDefinition(kind).stages[0];
    if (!first) throw new Error(`Workflow ${kind} has no stages`);
    const run = workflowRunSchema.parse({
      id,
      kind,
      currentStage: first.id,
      completedStages: [],
      updatedAt: now.toISOString(),
    });
    await this.write(run);
    return run;
  }

  async read(id: string): Promise<WorkflowRun> {
    return workflowRunSchema.parse(
      JSON.parse(await readFile(this.filePath(id), "utf8")) as unknown,
    );
  }

  async advance(id: string, now = new Date()): Promise<WorkflowRun> {
    const current = await this.read(id);
    const stages = getWorkflowDefinition(current.kind).stages;
    const index = stages.findIndex(
      (stage) => stage.id === current.currentStage,
    );
    const next = stages[index + 1];
    if (!next) throw new Error(`Workflow ${id} is already complete`);
    const updated = workflowRunSchema.parse({
      ...current,
      currentStage: next.id,
      completedStages: [...current.completedStages, current.currentStage],
      updatedAt: now.toISOString(),
    });
    await this.write(updated);
    return updated;
  }

  private async write(run: WorkflowRun): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const destination = this.filePath(run.id);
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(run, null, 2)}\n`, "utf8");
    await rename(temporary, destination);
  }
}
