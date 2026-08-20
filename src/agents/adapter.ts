import { z } from "zod";

function isRepositoryRelativePath(value: string): boolean {
  if (
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-z]:[\\/]/i.test(value)
  ) {
    return false;
  }
  return !value.replaceAll("\\", "/").split("/").includes("..");
}

const repositoryPathSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isRepositoryRelativePath, {
    message: "Adapter artifacts must use repository-relative paths",
  });
const adapterIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "Expected a canonical adapter ID")
  .max(80);

export const agentCapabilitiesSchema = z
  .object({
    setup: z.enum(["none", "automatic", "manual"]),
    contextDelivery: z
      .array(z.enum(["prompt", "file", "repository-instructions"]))
      .min(1)
      .refine((values) => new Set(values).size === values.length, {
        message: "Context delivery capabilities must be unique",
      }),
    enforcement: z.enum(["none", "advisory", "hard"]),
  })
  .strict();

export const agentDetectionSchema = z
  .object({
    detected: z.boolean(),
    confidence: z.enum(["none", "low", "high"]),
    evidence: z.array(z.string().trim().min(1)),
  })
  .strict()
  .superRefine((detection, context) => {
    if (detection.detected === (detection.confidence === "none")) {
      context.addIssue({
        code: "custom",
        message: "Detection and confidence must agree",
        path: ["confidence"],
      });
    }
    if (detection.detected && detection.evidence.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Detected agents require evidence",
        path: ["evidence"],
      });
    }
  });

export const agentSetupResultSchema = z
  .object({
    status: z.enum(["configured", "already-configured", "manual-required"]),
    changes: z.array(repositoryPathSchema),
    instructions: z.string().trim().min(1).nullable(),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.status === "manual-required" && result.instructions === null) {
      context.addIssue({
        code: "custom",
        message: "Manual setup requires instructions",
        path: ["instructions"],
      });
    }
  });

export const agentContextPayloadSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    content: z.string().min(1),
    format: z.enum(["markdown", "text"]),
    estimatedTokens: z.number().int().nonnegative().optional(),
  })
  .strict();

export const agentContextDeliveryResultSchema = z
  .object({
    status: z.enum(["delivered", "unsupported"]),
    mode: z.enum(["prompt", "file", "repository-instructions"]).nullable(),
    artifacts: z.array(repositoryPathSchema),
    message: z.string().trim().min(1).nullable(),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.status === "delivered" && result.mode === null) {
      context.addIssue({
        code: "custom",
        message: "Delivered context requires a delivery mode",
        path: ["mode"],
      });
    }
    if (result.status === "unsupported" && result.message === null) {
      context.addIssue({
        code: "custom",
        message: "Unsupported delivery requires an explanation",
        path: ["message"],
      });
    }
  });

export const agentHealthSchema = z
  .object({
    status: z.enum(["healthy", "degraded", "unavailable"]),
    checks: z.array(
      z
        .object({
          id: z.string().regex(/^[a-z][a-z0-9-]*$/),
          status: z.enum(["pass", "warn", "fail"]),
          message: z.string().trim().min(1),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((health, context) => {
    const statuses = new Set(health.checks.map((check) => check.status));
    const expected = statuses.has("fail")
      ? "unavailable"
      : statuses.has("warn")
        ? "degraded"
        : "healthy";
    if (health.status !== expected) {
      context.addIssue({
        code: "custom",
        message: `Health status must be ${expected} for its checks`,
        path: ["status"],
      });
    }
  });

export type AgentCapabilities = z.infer<typeof agentCapabilitiesSchema>;
export type AgentDetection = z.infer<typeof agentDetectionSchema>;
export type AgentSetupResult = z.infer<typeof agentSetupResultSchema>;
export type AgentContextPayload = z.infer<typeof agentContextPayloadSchema>;
export type AgentContextDeliveryResult = z.infer<
  typeof agentContextDeliveryResultSchema
>;
export type AgentHealth = z.infer<typeof agentHealthSchema>;

export interface AgentAdapterContext {
  projectRoot: string;
}

export interface AgentAdapter {
  readonly id: z.infer<typeof adapterIdSchema>;
  readonly displayName: string;
  readonly capabilities: AgentCapabilities;

  detect(context: AgentAdapterContext): Promise<AgentDetection>;
  setup(context: AgentAdapterContext): Promise<AgentSetupResult>;
  deliverContext(
    context: AgentAdapterContext,
    payload: AgentContextPayload,
  ): Promise<AgentContextDeliveryResult>;
  healthCheck(context: AgentAdapterContext): Promise<AgentHealth>;
}

export function validateAgentAdapterDefinition(
  adapter: Pick<AgentAdapter, "id" | "displayName" | "capabilities">,
): void {
  adapterIdSchema.parse(adapter.id);
  z.string().trim().min(1).max(120).parse(adapter.displayName);
  agentCapabilitiesSchema.parse(adapter.capabilities);
}
