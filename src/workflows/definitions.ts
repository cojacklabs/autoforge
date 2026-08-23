import { z } from "zod";
import { WORKFLOW_KINDS } from "../core/vocabularies.js";

export const workflowKindSchema = z.enum(WORKFLOW_KINDS);

export const workflowStageDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    label: z.string().min(1),
    required: z.boolean(),
  })
  .strict();

export const workflowDefinitionSchema = z
  .object({
    kind: workflowKindSchema,
    version: z.string().min(1),
    description: z.string().min(1),
    stages: z.array(workflowStageDefinitionSchema).min(1),
  })
  .strict();

export type WorkflowKind = z.infer<typeof workflowKindSchema>;
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

const definitions: readonly WorkflowDefinition[] = [
  {
    kind: "feature-development",
    version: "0.9.0",
    description: "Deliver a feature from intent through validation.",
    stages: [
      { id: "research", label: "Research", required: false },
      { id: "planning", label: "Planning", required: true },
      { id: "design", label: "Design", required: false },
      { id: "implementation", label: "Implementation", required: true },
      { id: "validation", label: "Validation", required: true },
    ],
  },
  {
    kind: "bug-fix",
    version: "0.9.0",
    description: "Diagnose, fix, and validate a defect.",
    stages: [
      { id: "research", label: "Diagnosis", required: true },
      { id: "implementation", label: "Fix", required: true },
      { id: "validation", label: "Validation", required: true },
    ],
  },
  {
    kind: "research",
    version: "0.9.0",
    description: "Investigate a question and record durable findings.",
    stages: [
      { id: "research", label: "Research", required: true },
      { id: "validation", label: "Review", required: true },
    ],
  },
  {
    kind: "design-create",
    version: "0.9.0",
    description: "Create and validate a design specification.",
    stages: [
      { id: "planning", label: "Planning", required: true },
      { id: "design", label: "Design", required: true },
      { id: "validation", label: "Validation", required: true },
    ],
  },
  {
    kind: "design-critique",
    version: "0.9.0",
    description: "Review an existing design and record changes.",
    stages: [
      { id: "design", label: "Critique", required: true },
      { id: "validation", label: "Validation", required: true },
    ],
  },
  {
    kind: "architecture-change",
    version: "0.9.0",
    description: "Evaluate and validate an architectural change.",
    stages: [
      { id: "research", label: "Research", required: false },
      { id: "planning", label: "Planning", required: true },
      { id: "validation", label: "Validation", required: true },
    ],
  },
  {
    kind: "data-change",
    version: "0.9.0",
    description: "Design, migrate, and validate a data model or schema change.",
    stages: [
      { id: "research", label: "Research", required: false },
      { id: "planning", label: "Planning", required: true },
      { id: "implementation", label: "Implementation", required: true },
      { id: "validation", label: "Validation", required: true },
    ],
  },
  {
    kind: "security-change",
    version: "0.9.0",
    description:
      "Design, implement, and validate a security or authorization change.",
    stages: [
      { id: "research", label: "Research", required: false },
      { id: "planning", label: "Planning", required: true },
      { id: "implementation", label: "Implementation", required: true },
      { id: "validation", label: "Validation", required: true },
    ],
  },
  {
    kind: "validation",
    version: "0.9.0",
    description: "Run a focused validation workflow.",
    stages: [{ id: "validation", label: "Validation", required: true }],
  },
];

export function listWorkflowDefinitions(): readonly WorkflowDefinition[] {
  return definitions;
}

export function getWorkflowDefinition(kind: WorkflowKind): WorkflowDefinition {
  return definitions.find((definition) => definition.kind === kind)!;
}
