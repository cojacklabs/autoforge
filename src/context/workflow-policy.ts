import { z } from "zod";

import type { WorkflowKind } from "../workflows/definitions.js";

export const workflowContextPolicySchema = z
  .object({
    stage: z.string().min(1),
    preferredTypes: z.array(z.string().min(1)),
    requiredSections: z.array(z.string().min(1)),
  })
  .strict();

export type WorkflowContextPolicy = z.infer<typeof workflowContextPolicySchema>;

const policies: Record<string, WorkflowContextPolicy> = {
  research: {
    stage: "research",
    preferredTypes: ["research", "architecture", "domain"],
    requiredSections: ["question", "sources", "findings"],
  },
  planning: {
    stage: "planning",
    preferredTypes: ["intent", "architecture", "design", "research"],
    requiredSections: ["objective", "requirements", "acceptanceCriteria"],
  },
  design: {
    stage: "design",
    preferredTypes: ["design", "screen", "component", "token", "flow"],
    requiredSections: ["designContract"],
  },
  implementation: {
    stage: "implementation",
    preferredTypes: ["architecture", "design", "api", "domain"],
    requiredSections: ["scope", "acceptanceCriteria", "validation"],
  },
  validation: {
    stage: "validation",
    preferredTypes: ["intent", "research", "architecture", "design"],
    requiredSections: ["acceptanceCriteria", "validation"],
  },
};

export function getWorkflowContextPolicy(
  _kind: WorkflowKind,
  stage: string,
): WorkflowContextPolicy {
  return workflowContextPolicySchema.parse(
    policies[stage] ?? {
      stage,
      preferredTypes: [],
      requiredSections: [],
    },
  );
}
