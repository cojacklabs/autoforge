import { z } from "zod";

import { discoverySchema } from "../bootstrap/discovery.js";
import { discoveryQuestionInputSchema } from "../bootstrap/questions.js";
import { triageIntentSchema } from "../intent/triage.js";
import {
  orchestrationHandoffInputSchema,
  orchestrationPlanInputSchema,
} from "../orchestration/schemas.js";
import { specificationSchema } from "../specifications/schemas.js";
import { storageBundleSchema } from "../workspace/tiered-storage.js";
import { workflowHandoffSchema } from "../workflows/handoff.js";

const catalog = {
  "bootstrap-discover": discoverySchema,
  "bootstrap-discovery-questions": discoveryQuestionInputSchema,
  "intent-assess": triageIntentSchema,
  "intent-register": specificationSchema,
  "research-register": specificationSchema,
  "workflow-handoff": workflowHandoffSchema,
  "orchestrate-plan": orchestrationPlanInputSchema,
  "orchestrate-handoff": orchestrationHandoffInputSchema,
  "projects-global-import": storageBundleSchema,
} satisfies Record<string, z.ZodType>;

export type InputSchemaId = keyof typeof catalog;

export function listInputSchemas(): InputSchemaId[] {
  return (Object.keys(catalog) as InputSchemaId[]).sort();
}

export function getInputSchema(id: string): z.ZodType | undefined {
  return catalog[id as InputSchemaId];
}

export function inputSchemaJson(id: string): Record<string, unknown> {
  const schema = getInputSchema(id);
  if (!schema) {
    throw new Error(
      `Unknown input schema ${id}. Available schemas: ${listInputSchemas().join(", ")}`,
    );
  }
  return z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "input",
  }) as Record<string, unknown>;
}
