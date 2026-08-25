import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  getWorkflowDefinition,
  workflowKindSchema,
  type WorkflowKind,
} from "./definitions.js";
import { workflowHandoffSchema, type WorkflowHandoff } from "./handoff.js";

export const workflowRunSchema = z
  .object({
    id: z.string().min(1),
    kind: workflowKindSchema,
    currentStage: z.string().min(1),
    completedStages: z.array(z.string()),
    status: z.enum(["active", "completed"]),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type WorkflowRun = z.infer<typeof workflowRunSchema>;

export class WorkflowStateStore {
  private readonly directory: string;
  private readonly handoffDirectory: string;

  constructor(projectRoot: string) {
    this.directory = path.join(projectRoot, ".autoforge", "workflows");
    this.handoffDirectory = path.join(this.directory, "handoffs");
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
      status: "active",
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

  async list(): Promise<WorkflowRun[]> {
    try {
      const entries = await readdir(this.directory, { withFileTypes: true });
      const runs = await Promise.all(
        entries
          .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
          .map((entry) => this.read(entry.name.slice(0, -5))),
      );
      return runs.sort((left, right) => left.id.localeCompare(right.id));
    } catch {
      return [];
    }
  }

  async writeHandoff(handoff: WorkflowHandoff): Promise<string> {
    const validated = workflowHandoffSchema.parse(handoff);
    await mkdir(this.handoffDirectory, { recursive: true });
    const destination = path.join(
      this.handoffDirectory,
      `${validated.workflowId}-${validated.fromStage}-to-${validated.toStage}.json`,
    );
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(
      temporary,
      `${JSON.stringify(validated, null, 2)}\n`,
      "utf8",
    );
    await rename(temporary, destination);
    return path.relative(path.dirname(this.directory), destination);
  }

  async readHandoff(
    workflowId: string,
    fromStage: string,
    toStage: string,
  ): Promise<WorkflowHandoff> {
    return workflowHandoffSchema.parse(
      JSON.parse(
        await readFile(
          path.join(
            this.handoffDirectory,
            `${workflowId}-${fromStage}-to-${toStage}.json`,
          ),
          "utf8",
        ),
      ) as unknown,
    );
  }

  async advance(
    id: string,
    now = new Date(),
    skipOptional = false,
  ): Promise<WorkflowRun> {
    const current = await this.read(id);
    if (current.status === "completed") {
      throw new Error(`Workflow ${id} is already complete`);
    }
    const stages = getWorkflowDefinition(current.kind).stages;
    const index = stages.findIndex(
      (stage) => stage.id === current.currentStage,
    );
    let nextIndex = index + 1;
    if (skipOptional) {
      while (nextIndex < stages.length && !stages[nextIndex]?.required)
        nextIndex += 1;
    }
    const next = stages[nextIndex];
    if (!next) {
      const completed = workflowRunSchema.parse({
        ...current,
        status: "completed",
        completedStages: [...current.completedStages, current.currentStage],
        updatedAt: now.toISOString(),
      });
      await this.write(completed);
      return completed;
    }
    const updated = workflowRunSchema.parse({
      ...current,
      currentStage: next.id,
      completedStages: [
        ...current.completedStages,
        current.currentStage,
        ...(skipOptional
          ? stages.slice(index + 1, nextIndex).map((stage) => stage.id)
          : []),
      ],
      updatedAt: now.toISOString(),
    });
    await this.writeHandoff({
      protocolVersion: "1",
      workflowId: current.id,
      workflowKind: current.kind,
      fromStage: current.currentStage,
      toStage: next.id,
      objective: `Continue workflow ${current.id}.`,
      completedWork: [`Completed ${current.currentStage} stage.`],
      decisions: [],
      openQuestions: [],
      validation: [`Workflow state advanced to ${next.id}.`],
      sourceArtifacts: [],
      createdAt: now.toISOString(),
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
