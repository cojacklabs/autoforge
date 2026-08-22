import { createHash } from "node:crypto";

import { createAgentGovernanceDirectives } from "../agents/governance.js";
import { inspectInstallation } from "../commands/init.js";
import { generateAgentContract } from "../contract/generator.js";
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { ContextPacketCompiler } from "../context/packet.js";
import { ContextResolver } from "../context/resolver.js";
import { doctrineSessionStateSchema } from "../doctrine/session.js";
import { routeDoctrines } from "../doctrine/router.js";
import { evaluateGovernance } from "../governance/evaluate.js";
import { ConstitutionStore } from "../governance/store.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import { SpecificationFileStore } from "../specifications/store.js";
import { workStateSchema } from "../work/schemas.js";
import type { WorkflowKind } from "../workflows/definitions.js";
import type {
  OrchestrationAssignmentContext,
  OrchestrationNode,
  OrchestrationRole,
} from "./schemas.js";

export interface CompileOrchestrationContextInput {
  node: OrchestrationNode;
  agentId: string;
  role: OrchestrationRole;
  contextBudget: number;
  createdAt: string;
}

export interface OrchestrationContextProvider {
  compile(
    input: CompileOrchestrationContextInput,
  ): Promise<ResolvedOrchestrationContext>;
}

export interface ResolvedOrchestrationContext {
  context: OrchestrationAssignmentContext;
  requiredActions: string[];
  prohibitedActions: string[];
  validationCommands: string[];
  completionRequirements: string[];
}

const roleSpecificationTypes: Record<OrchestrationRole, readonly string[]> = {
  product: ["intent", "product", "research", "flow"],
  architecture: ["architecture", "api", "domain", "research"],
  design: [
    "design",
    "screen",
    "component",
    "flow",
    "token",
    "state",
    "responsive",
  ],
  frontend: [
    "design",
    "screen",
    "component",
    "flow",
    "token",
    "state",
    "responsive",
  ],
  backend: ["architecture", "api", "domain"],
  security: ["architecture", "api", "domain", "research"],
  qa: ["intent", "research", "design", "architecture"],
  research: ["research", "intent", "architecture", "domain"],
  general: [],
};

function workflowKind(node: OrchestrationNode): WorkflowKind {
  if (node.stage === "research") return "research";
  if (node.stage === "design") return "design-create";
  if (["test", "validation", "release"].includes(node.stage))
    return "validation";
  if (node.role === "architecture") return "architecture-change";
  return "feature-development";
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export class ProjectOrchestrationContextProvider implements OrchestrationContextProvider {
  constructor(private readonly projectRoot: string) {}

  async compile(
    input: CompileOrchestrationContextInput,
  ): Promise<ResolvedOrchestrationContext> {
    const installation = await inspectInstallation(this.projectRoot);
    if (
      installation.status !== "current" ||
      !installation.config ||
      !installation.work ||
      !installation.decisions ||
      !installation.doctrines
    ) {
      throw new AutoForgeError(
        "INVALID_STATE",
        "Orchestration context requires a current AutoForge installation",
        { exitCode: EXIT_CODE.invalidState },
      );
    }
    const workKind = input.node.workId.startsWith("issue.") ? "issue" : "task";
    const collection =
      workKind === "issue"
        ? installation.work.data.issues
        : installation.work.data.tasks;
    if (!collection.some((item) => item.id === input.node.workId)) {
      throw new AutoForgeError(
        "INVALID_STATE",
        `Orchestration work ${input.node.workId} is missing from canonical work state`,
        { exitCode: EXIT_CODE.invalidState },
      );
    }
    const work = workStateSchema.parse({
      ...installation.work.data,
      tasks: installation.work.data.tasks.map((item) => ({
        ...item,
        status:
          item.id === input.node.workId
            ? "active"
            : item.status === "active"
              ? "ready"
              : item.status,
      })),
      issues: installation.work.data.issues.map((item) => ({
        ...item,
        status:
          item.id === input.node.workId
            ? "active"
            : item.status === "active"
              ? "ready"
              : item.status,
      })),
      activeWork: {
        kind: workKind,
        id: input.node.workId,
        startedAt: input.createdAt,
      },
    });
    const objective = [
      input.node.objective,
      `Assigned role: ${input.role}`,
      `Stage: ${input.node.stage}`,
    ].join("\n");
    const selections = routeDoctrines(installation.doctrines.data, {
      objective,
      workKind,
      scopeTags: [input.role, input.node.stage],
      paths: input.node.scope.include,
    });
    const doctrineSessions = doctrineSessionStateSchema.parse({
      current: {
        sessionId: `session.orchestration-${input.node.workId.replaceAll(".", "-")}`,
        workKind,
        workId: input.node.workId,
        selectedAt: input.createdAt,
        endedAt: null,
        selections: selections.map((selection) => ({
          doctrineId: selection.doctrine.id,
          score: selection.score,
          reasons: selection.reasons,
        })),
      },
      previous: [],
    });
    const constitution = await new ConstitutionStore(this.projectRoot)
      .load()
      .catch((error: unknown) => {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        )
          return null;
        throw error;
      });
    const governance = constitution
      ? evaluateGovernance(constitution, {
          objective: input.node.objective,
          workKind: input.node.stage,
          paths: input.node.scope.include,
          tags: [input.role, input.node.stage],
        })
      : [];
    const governanceDirectives = createAgentGovernanceDirectives(governance);
    const validationCommands = installation.config.qualityGates.length
      ? installation.config.qualityGates.map(({ command, args }) =>
          [command, ...args].join(" "),
        )
      : ["npm test"];
    const contract = generateAgentContract({
      agentId: input.agentId,
      projectRoot: this.projectRoot,
      activeWorkId: input.node.workId,
      workflowKind: workflowKind(input.node),
      workflowStage: input.node.stage,
      validationCommands,
    });
    const selection = await new ContextResolver().resolve({
      work,
      decisions: installation.decisions.data,
      doctrines: installation.doctrines.data,
      doctrineSessions,
      specifications: new SpecificationRegistry(
        new SpecificationFileStore(this.projectRoot),
      ),
      config: { contextBudget: { maxTokens: input.contextBudget } },
      taskDescription: objective,
      preferredSpecificationTypes: roleSpecificationTypes[input.role],
      workflow: {
        kind: workflowKind(input.node),
        currentStage: input.node.stage,
        status: "active",
        handoffIds: [],
      },
      governance,
    });
    const packet = new ContextPacketCompiler().compile(selection);
    const sources = [
      {
        kind: "work" as const,
        id: selection.work.item.id,
        reasons: selection.work.reasons,
        estimatedTokens: selection.work.estimatedTokens,
      },
      ...selection.doctrines.map((reference) => ({
        kind: "doctrine" as const,
        id: reference.doctrine.id,
        reasons: reference.reasons,
        estimatedTokens: reference.estimatedTokens,
      })),
      ...selection.decisions.map((reference) => ({
        kind: "decision" as const,
        id: reference.decision.id,
        reasons: reference.reasons,
        estimatedTokens: reference.estimatedTokens,
      })),
      ...selection.specs.map((reference) => ({
        kind: "specification" as const,
        id: reference.specification.id,
        reasons: reference.reasons,
        estimatedTokens: reference.estimatedTokens,
      })),
    ];
    const sourceFingerprint = fingerprint({
      workRevision: installation.work.revision,
      decisionRevision: installation.decisions.revision,
      doctrineRevision: installation.doctrines.revision,
      role: input.role,
      stage: input.node.stage,
      objective: input.node.objective,
      sources,
      exclusions: selection.exclusions,
      governance,
    });
    return {
      context: {
        content: packet.content,
        estimatedTokens: packet.estimatedTokens,
        sourceFingerprint,
        sources,
        exclusions: selection.exclusions.map(
          ({ kind, id, reason, details }) => ({
            kind,
            id,
            reason,
            details,
          }),
        ),
      },
      requiredActions: [
        ...contract.requiredActions,
        ...governanceDirectives.requiredActions,
      ],
      prohibitedActions: [
        ...contract.prohibitedActions,
        ...governanceDirectives.prohibitedActions,
      ],
      validationCommands,
      completionRequirements: contract.completionRequirements,
    };
  }
}
