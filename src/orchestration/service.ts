import { createHash, randomUUID } from "node:crypto";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import {
  assertAgentContractCompatibility,
  normalizeAgentId,
} from "../contract/capabilities.js";
import type { WorkState } from "../work/schemas.js";
import {
  orchestrationAssignmentPacketSchema,
  orchestrationHandoffInputSchema,
  orchestrationPlanInputSchema,
  orchestrationStateSchema,
  type OrchestrationAssignment,
  type OrchestrationHandoffInput,
  type OrchestrationNode,
  type OrchestrationPlanInput,
  type OrchestrationRole,
  type OrchestrationState,
} from "./schemas.js";
import { OrchestrationStore } from "./store.js";
import { GitWorktreeManager, type WorktreeManager } from "./worktrees.js";
import {
  ProjectOrchestrationContextProvider,
  type OrchestrationContextProvider,
} from "./context.js";

export interface ClaimWorkInput {
  workId: string;
  agentId: string;
  role?: OrchestrationRole;
  mode?: "read" | "write";
  ttlMinutes?: number;
}

export interface ExplainWorkResult {
  workId: string;
  status: OrchestrationNode["status"];
  eligible: boolean;
  rank: number | null;
  reasons: string[];
  dependencies: Array<{ workId: string; status: OrchestrationNode["status"] }>;
  gates: Array<{ id: string; type: string; status: string }>;
  activeAssignment: OrchestrationAssignment | null;
  contextFreshness: "fresh" | "stale" | "unavailable" | null;
  contextReasons: string[];
}

export interface OrchestrationServiceOptions {
  now?: () => Date;
  id?: () => string;
  worktrees?: WorktreeManager;
  contextBudget?: number;
  contextProvider?: OrchestrationContextProvider;
}

function orchestrationError(
  code: "INVALID_ARGUMENT" | "STATE_CONFLICT" | "INVALID_STATE",
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): AutoForgeError {
  return new AutoForgeError(code, message, {
    details,
    exitCode:
      code === "INVALID_ARGUMENT"
        ? EXIT_CODE.usage
        : code === "STATE_CONFLICT"
          ? EXIT_CODE.conflict
          : EXIT_CODE.invalidState,
  });
}

function scopeRoot(pattern: string): string {
  const normalized = pattern.replaceAll("\\", "/");
  const wildcard = normalized.search(/[?*\[]/);
  const prefix = wildcard === -1 ? normalized : normalized.slice(0, wildcard);
  return prefix.replace(/\/$/, "");
}

export function scopesOverlap(
  left: OrchestrationNode["scope"],
  right: OrchestrationNode["scope"],
): boolean {
  return left.include.some((leftPattern) =>
    right.include.some((rightPattern) => {
      const leftRoot = scopeRoot(leftPattern);
      const rightRoot = scopeRoot(rightPattern);
      return (
        leftRoot.length === 0 ||
        rightRoot.length === 0 ||
        leftRoot === rightRoot ||
        leftRoot.startsWith(`${rightRoot}/`) ||
        rightRoot.startsWith(`${leftRoot}/`)
      );
    }),
  );
}

function requiredGateTypes(
  node: Pick<OrchestrationNode, "role" | "risk" | "releaseCritical" | "stage">,
): Array<"architecture" | "security" | "release"> {
  const types = new Set<"architecture" | "security" | "release">();
  if (node.role === "architecture" || node.risk === "high") {
    types.add("architecture");
  }
  if (node.role === "security" || node.risk === "critical") {
    types.add("security");
  }
  if (node.releaseCritical || node.stage === "release") {
    types.add("release");
  }
  return [...types];
}

function eventId(id: string): string {
  return `event.${id}`;
}

function gateId(workId: string, type: string): string {
  return `gate.${workId}.${type}`;
}

function downstreamCount(state: OrchestrationState, workId: string): number {
  const seen = new Set<string>();
  const visit = (candidate: string): void => {
    for (const node of state.nodes) {
      if (node.dependencies.includes(candidate) && !seen.has(node.workId)) {
        seen.add(node.workId);
        visit(node.workId);
      }
    }
  };
  visit(workId);
  return seen.size;
}

const riskRank = { low: 0, normal: 1, high: 2, critical: 3 } as const;

function compareReady(
  state: OrchestrationState,
  left: OrchestrationNode,
  right: OrchestrationNode,
): number {
  const values = [
    Number(right.priority === 100) - Number(left.priority === 100),
    Number(right.releaseCritical) - Number(left.releaseCritical),
    downstreamCount(state, right.workId) - downstreamCount(state, left.workId),
    riskRank[right.risk] - riskRank[left.risk],
    right.priority - left.priority,
    Date.parse(left.createdAt) - Date.parse(right.createdAt),
  ];
  return (
    values.find((value) => value !== 0) ??
    left.workId.localeCompare(right.workId)
  );
}

function assertAcyclic(nodes: OrchestrationPlanInput["nodes"]): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(nodes.map((node) => [node.workId, node]));
  const visit = (workId: string): void => {
    if (visiting.has(workId)) {
      throw orchestrationError(
        "INVALID_ARGUMENT",
        `Orchestration plan contains a dependency cycle at ${workId}`,
      );
    }
    if (visited.has(workId)) return;
    visiting.add(workId);
    for (const dependency of byId.get(workId)?.dependencies ?? []) {
      visit(dependency);
    }
    visiting.delete(workId);
    visited.add(workId);
  };
  for (const node of nodes) visit(node.workId);
}

export function planFromWorkState(work: WorkState): OrchestrationPlanInput {
  return orchestrationPlanInputSchema.parse({
    nodes: [...work.tasks, ...work.issues]
      .filter(
        (item) => item.status !== "completed" && item.status !== "canceled",
      )
      .map((item) => ({
        workId: item.id,
        objective: item.description,
        acceptanceCriteria: [],
        stage: "implementation",
        role: "general",
        dependencies: [],
        priority: item.status === "active" ? 100 : 50,
        releaseCritical: false,
        risk: "normal",
        scope: item.scope,
        requiredCapabilities: ["contextPackets", "contractValidation"],
      })),
  });
}

export class OrchestrationService {
  private readonly store: OrchestrationStore;
  private readonly projectRoot: string;
  private readonly now: () => Date;
  private readonly id: () => string;
  private readonly worktrees: WorktreeManager;
  private readonly contextBudget: number;
  private readonly contextProvider: OrchestrationContextProvider;

  constructor(projectRoot: string, options: OrchestrationServiceOptions = {}) {
    this.projectRoot = projectRoot;
    this.store = new OrchestrationStore(projectRoot);
    this.now = options.now ?? (() => new Date());
    this.id = options.id ?? randomUUID;
    this.worktrees = options.worktrees ?? new GitWorktreeManager();
    this.contextBudget = options.contextBudget ?? 12_000;
    this.contextProvider =
      options.contextProvider ??
      new ProjectOrchestrationContextProvider(projectRoot);
  }

  async plan(input: OrchestrationPlanInput): Promise<OrchestrationState> {
    const validated = orchestrationPlanInputSchema.parse(input);
    assertAcyclic(validated.nodes);
    await this.store.ensure();
    const current = await this.store.state.read();
    if (
      current.state.data.assignments.some(
        (assignment) => assignment.status === "active",
      )
    ) {
      throw orchestrationError(
        "STATE_CONFLICT",
        "Cannot replace an orchestration plan while assignments are active",
      );
    }
    const timestamp = this.now().toISOString();
    const nodes: OrchestrationNode[] = validated.nodes.map((node) => ({
      ...node,
      status: "blocked",
      blockedReasons: ["Readiness has not been evaluated"],
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const gates = nodes.flatMap((node) =>
      requiredGateTypes(node).map((type) => ({
        id: gateId(node.workId, type),
        workId: node.workId,
        type,
        status: "pending" as const,
        rationale: `${type} approval is required for ${node.workId}.`,
        createdAt: timestamp,
        decidedAt: null,
        decidedBy: null,
      })),
    );
    const next = this.refresh({
      nodes,
      assignments: [],
      leases: [],
      gates,
      events: [
        {
          id: eventId(this.id()),
          type: "plan-created",
          workId: null,
          assignmentId: null,
          message: `Created orchestration plan with ${nodes.length} work item(s).`,
          createdAt: timestamp,
        },
      ],
    });
    const committed = await this.store.state.write(next, {
      expectedRevision: current.state.revision,
    });
    return committed.data;
  }

  async status(): Promise<OrchestrationState> {
    await this.store.ensure();
    return this.persistRefresh();
  }

  async ready(): Promise<OrchestrationNode[]> {
    const state = await this.status();
    return state.nodes
      .filter((node) => node.status === "ready")
      .sort((left, right) => compareReady(state, left, right));
  }

  async claim(input: ClaimWorkInput): Promise<OrchestrationAssignment> {
    assertAgentContractCompatibility(input.agentId);
    const canonicalAgentId = normalizeAgentId(input.agentId);
    const state = await this.status();
    const current = await this.store.state.read();
    const node = state.nodes.find(
      (candidate) => candidate.workId === input.workId,
    );
    if (!node) {
      throw orchestrationError(
        "INVALID_ARGUMENT",
        `Unknown orchestration work ${input.workId}`,
      );
    }
    if (node.status !== "ready") {
      throw orchestrationError(
        "STATE_CONFLICT",
        `${node.workId} is not ready: ${node.blockedReasons.join("; ") || node.status}`,
      );
    }
    const role = input.role ?? node.role;
    if (role !== node.role && node.role !== "general") {
      throw orchestrationError(
        "STATE_CONFLICT",
        `${input.workId} requires the ${node.role} role`,
      );
    }
    const capability = assertAgentContractCompatibility(canonicalAgentId);
    for (const requirement of node.requiredCapabilities) {
      if (
        !(requirement in capability) ||
        !capability[requirement as keyof typeof capability]
      ) {
        throw orchestrationError(
          "STATE_CONFLICT",
          `Agent ${canonicalAgentId} lacks required capability ${requirement}`,
        );
      }
    }
    const mode = input.mode ?? "write";
    const ttlMinutes = input.ttlMinutes ?? 60;
    if (!Number.isInteger(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > 1_440) {
      throw orchestrationError(
        "INVALID_ARGUMENT",
        "Lease TTL must be between 1 and 1440 minutes",
      );
    }
    if (
      mode === "write" &&
      state.leases.some(
        (lease) =>
          lease.mode === "write" &&
          lease.releasedAt === null &&
          Date.parse(lease.expiresAt) > this.now().getTime() &&
          scopesOverlap(node.scope, lease.scope),
      )
    ) {
      throw orchestrationError(
        "STATE_CONFLICT",
        `A write lease already overlaps ${input.workId}`,
      );
    }
    const timestamp = this.now().toISOString();
    const assignmentId = `assignment.${this.id()}`;
    const leaseId = `lease.${this.id()}`;
    const resolvedContext = await this.contextProvider.compile({
      node,
      agentId: canonicalAgentId,
      role,
      contextBudget: this.contextBudget,
      createdAt: timestamp,
    });
    const packet = orchestrationAssignmentPacketSchema.parse({
      assignmentId,
      workId: node.workId,
      objective: node.objective,
      acceptanceCriteria: node.acceptanceCriteria,
      agentId: canonicalAgentId,
      role,
      stage: node.stage,
      allowedFiles: node.scope,
      requiredCapabilities: node.requiredCapabilities,
      dependencies: node.dependencies,
      permittedActions: [
        `Complete the ${node.stage} stage for ${node.workId}.`,
        ...resolvedContext.requiredActions,
      ],
      prohibitedActions: [
        "Edit files outside the leased scope.",
        "Bypass required approval gates.",
        ...resolvedContext.prohibitedActions,
      ],
      validationRequirements: [
        ...resolvedContext.validationCommands.map(
          (command) => `Run: ${command}`,
        ),
        ...resolvedContext.completionRequirements,
      ],
      contextBudget: this.contextBudget,
      context: resolvedContext.context,
      createdAt: timestamp,
    });
    const contextDigest = createHash("sha256")
      .update(JSON.stringify(packet))
      .digest("hex");
    const assignment: OrchestrationAssignment = {
      id: assignmentId,
      workId: node.workId,
      agentId: canonicalAgentId,
      role,
      mode,
      status: "active",
      leaseId,
      claimedAt: timestamp,
      endedAt: null,
      branch: null,
      worktree: null,
      contextDigest,
    };
    const next = orchestrationStateSchema.parse({
      ...state,
      nodes: state.nodes.map((candidate) =>
        candidate.workId === node.workId
          ? {
              ...candidate,
              status: "active",
              blockedReasons: [],
              updatedAt: timestamp,
            }
          : candidate,
      ),
      assignments: [...state.assignments, assignment],
      leases: [
        ...state.leases,
        {
          id: leaseId,
          assignmentId,
          workId: node.workId,
          mode,
          scope: node.scope,
          acquiredAt: timestamp,
          expiresAt: new Date(
            Date.parse(timestamp) + ttlMinutes * 60_000,
          ).toISOString(),
          releasedAt: null,
        },
      ],
      events: [
        ...state.events,
        {
          id: eventId(this.id()),
          type: "assignment-claimed",
          workId: node.workId,
          assignmentId,
          message: `${canonicalAgentId} claimed ${node.workId} as ${role}.`,
          createdAt: timestamp,
        },
      ],
    });
    await this.store.state.write(next, {
      expectedRevision: current.state.revision,
    });
    let worktree: { branch: string; path: string } | null = null;
    try {
      worktree =
        mode === "write"
          ? await this.worktrees.provision(
              this.projectRoot,
              node.workId,
              assignmentId,
            )
          : null;
      await this.store.writePacket(packet);
      return await this.finalizeAssignmentWorktree(
        assignmentId,
        worktree?.branch ?? null,
        worktree?.path ?? null,
      );
    } catch (error) {
      if (worktree && this.worktrees.cleanup) {
        await this.worktrees
          .cleanup(this.projectRoot, worktree.path)
          .catch(() => undefined);
      }
      await this.release(assignmentId).catch(() => undefined);
      throw error;
    }
  }

  async handoff(
    assignmentId: string,
    input: OrchestrationHandoffInput,
  ): Promise<OrchestrationState> {
    const handoff = orchestrationHandoffInputSchema.parse(input);
    const state = await this.status();
    const current = await this.store.state.read();
    const assignment = state.assignments.find(
      (candidate) => candidate.id === assignmentId,
    );
    if (!assignment || assignment.status !== "active") {
      throw orchestrationError(
        "STATE_CONFLICT",
        `Assignment ${assignmentId} is not active`,
      );
    }
    const node = state.nodes.find(
      (candidate) => candidate.workId === assignment.workId,
    )!;
    if (
      ["test", "validation", "release"].includes(node.stage) &&
      handoff.validation.length === 0
    ) {
      throw orchestrationError(
        "STATE_CONFLICT",
        `${node.stage} handoffs require validation evidence`,
      );
    }
    await this.store.writeHandoff(assignmentId, handoff);
    const timestamp = this.now().toISOString();
    const next = this.refresh({
      ...state,
      nodes: state.nodes.map((candidate) =>
        candidate.workId === assignment.workId
          ? {
              ...candidate,
              status: "completed",
              blockedReasons: [],
              updatedAt: timestamp,
            }
          : candidate,
      ),
      assignments: state.assignments.map((candidate) =>
        candidate.id === assignmentId
          ? { ...candidate, status: "completed", endedAt: timestamp }
          : candidate,
      ),
      leases: state.leases.map((lease) =>
        lease.id === assignment.leaseId
          ? { ...lease, releasedAt: timestamp }
          : lease,
      ),
      events: [
        ...state.events,
        {
          id: eventId(this.id()),
          type: "assignment-handed-off",
          workId: assignment.workId,
          assignmentId,
          message: `Completed ${assignment.workId} with ${handoff.validation.length} validation result(s).`,
          createdAt: timestamp,
        },
      ],
    });
    const committed = await this.store.state.write(next, {
      expectedRevision: current.state.revision,
    });
    return committed.data;
  }

  async release(assignmentId: string): Promise<OrchestrationState> {
    const state = await this.status();
    const current = await this.store.state.read();
    const assignment = state.assignments.find(
      (candidate) => candidate.id === assignmentId,
    );
    if (!assignment || assignment.status !== "active") {
      throw orchestrationError(
        "STATE_CONFLICT",
        `Assignment ${assignmentId} is not active`,
      );
    }
    const timestamp = this.now().toISOString();
    const next = this.refresh({
      ...state,
      nodes: state.nodes.map((node) =>
        node.workId === assignment.workId
          ? {
              ...node,
              status: "blocked",
              blockedReasons: ["Readiness has not been evaluated"],
              updatedAt: timestamp,
            }
          : node,
      ),
      assignments: state.assignments.map((candidate) =>
        candidate.id === assignmentId
          ? { ...candidate, status: "released", endedAt: timestamp }
          : candidate,
      ),
      leases: state.leases.map((lease) =>
        lease.id === assignment.leaseId
          ? { ...lease, releasedAt: timestamp }
          : lease,
      ),
      events: [
        ...state.events,
        {
          id: eventId(this.id()),
          type: "assignment-released",
          workId: assignment.workId,
          assignmentId,
          message: `Released ${assignmentId} without completing work.`,
          createdAt: timestamp,
        },
      ],
    });
    const committed = await this.store.state.write(next, {
      expectedRevision: current.state.revision,
    });
    return committed.data;
  }

  async approve(
    gateIdValue: string,
    actor: string,
  ): Promise<OrchestrationState> {
    const state = await this.status();
    const current = await this.store.state.read();
    const gate = state.gates.find((candidate) => candidate.id === gateIdValue);
    if (!gate || gate.status !== "pending") {
      throw orchestrationError(
        "STATE_CONFLICT",
        `Gate ${gateIdValue} is not pending`,
      );
    }
    const timestamp = this.now().toISOString();
    const next = this.refresh({
      ...state,
      gates: state.gates.map((candidate) =>
        candidate.id === gateIdValue
          ? {
              ...candidate,
              status: "approved",
              decidedAt: timestamp,
              decidedBy: actor,
            }
          : candidate,
      ),
      events: [
        ...state.events,
        {
          id: eventId(this.id()),
          type: "gate-approved",
          workId: gate.workId,
          assignmentId: null,
          message: `${actor} approved ${gateIdValue}.`,
          createdAt: timestamp,
        },
      ],
    });
    const committed = await this.store.state.write(next, {
      expectedRevision: current.state.revision,
    });
    return committed.data;
  }

  async prioritize(
    workId: string,
    priority: number,
  ): Promise<OrchestrationState> {
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
      throw orchestrationError(
        "INVALID_ARGUMENT",
        "Priority must be an integer between 0 and 100",
      );
    }
    const state = await this.status();
    const current = await this.store.state.read();
    const node = state.nodes.find((candidate) => candidate.workId === workId);
    if (!node) {
      throw orchestrationError(
        "INVALID_ARGUMENT",
        `Unknown orchestration work ${workId}`,
      );
    }
    if (node.status === "completed" || node.status === "canceled") {
      throw orchestrationError(
        "STATE_CONFLICT",
        `Cannot reprioritize ${node.status} work ${workId}`,
      );
    }
    const timestamp = this.now().toISOString();
    const committed = await this.store.state.write(
      {
        ...state,
        nodes: state.nodes.map((candidate) =>
          candidate.workId === workId
            ? { ...candidate, priority, updatedAt: timestamp }
            : candidate,
        ),
      },
      { expectedRevision: current.state.revision },
    );
    return committed.data;
  }

  async explain(workId: string): Promise<ExplainWorkResult> {
    const state = await this.status();
    const node = state.nodes.find((candidate) => candidate.workId === workId);
    if (!node)
      throw orchestrationError(
        "INVALID_ARGUMENT",
        `Unknown orchestration work ${workId}`,
      );
    const ready = state.nodes
      .filter((candidate) => candidate.status === "ready")
      .sort((left, right) => compareReady(state, left, right));
    const rank = ready.findIndex((candidate) => candidate.workId === workId);
    const activeAssignment =
      state.assignments.find(
        (assignment) =>
          assignment.workId === workId && assignment.status === "active",
      ) ?? null;
    let contextFreshness: ExplainWorkResult["contextFreshness"] = null;
    const contextReasons: string[] = [];
    if (activeAssignment) {
      try {
        const stored = await this.store.readPacket(activeAssignment.id);
        const currentContext = await this.contextProvider.compile({
          node,
          agentId: activeAssignment.agentId,
          role: activeAssignment.role,
          contextBudget: stored.contextBudget,
          createdAt: stored.createdAt,
        });
        contextFreshness =
          stored.context.sourceFingerprint ===
          currentContext.context.sourceFingerprint
            ? "fresh"
            : "stale";
        contextReasons.push(
          contextFreshness === "fresh"
            ? "Canonical context sources match the claimed assignment packet."
            : "Canonical context sources changed after the assignment packet was generated.",
        );
      } catch (error) {
        contextFreshness = "unavailable";
        contextReasons.push(
          error instanceof Error
            ? error.message
            : "Context freshness could not be evaluated.",
        );
      }
    }
    return {
      workId,
      status: node.status,
      eligible: node.status === "ready",
      rank: rank === -1 ? null : rank + 1,
      reasons:
        node.status === "ready"
          ? [
              node.priority === 100
                ? "Human-pinned priority"
                : `Priority ${node.priority}`,
              node.releaseCritical
                ? "Release-critical work"
                : "Not release-critical",
              `Unlocks ${downstreamCount(state, node.workId)} downstream item(s)`,
              `Risk classification ${node.risk}`,
            ]
          : node.blockedReasons.length > 0
            ? node.blockedReasons
            : [`Work is ${node.status}`],
      dependencies: node.dependencies.map((dependency) => ({
        workId: dependency,
        status: state.nodes.find(
          (candidate) => candidate.workId === dependency,
        )!.status,
      })),
      gates: state.gates
        .filter((gate) => gate.workId === workId)
        .map((gate) => ({ id: gate.id, type: gate.type, status: gate.status })),
      activeAssignment,
      contextFreshness,
      contextReasons,
    };
  }

  private async persistRefresh(): Promise<OrchestrationState> {
    const current = await this.store.state.read();
    const next = this.refresh(current.state.data);
    if (JSON.stringify(next) === JSON.stringify(current.state.data))
      return next;
    return (
      await this.store.state.write(next, {
        expectedRevision: current.state.revision,
      })
    ).data;
  }

  private async finalizeAssignmentWorktree(
    assignmentId: string,
    branch: string | null,
    worktree: string | null,
  ): Promise<OrchestrationAssignment> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await this.store.state.read();
      const assignment = current.state.data.assignments.find(
        (candidate) => candidate.id === assignmentId,
      );
      if (!assignment || assignment.status !== "active") {
        throw orchestrationError(
          "STATE_CONFLICT",
          `Assignment ${assignmentId} lost its reservation`,
        );
      }
      try {
        const committed = await this.store.state.write(
          {
            ...current.state.data,
            assignments: current.state.data.assignments.map((candidate) =>
              candidate.id === assignmentId
                ? { ...candidate, branch, worktree }
                : candidate,
            ),
          },
          { expectedRevision: current.state.revision },
        );
        return committed.data.assignments.find(
          (candidate) => candidate.id === assignmentId,
        )!;
      } catch (error) {
        if (
          !(error instanceof AutoForgeError) ||
          error.code !== "STATE_CONFLICT" ||
          attempt === 2
        ) {
          throw error;
        }
      }
    }
    throw orchestrationError(
      "STATE_CONFLICT",
      `Unable to finalize assignment ${assignmentId}`,
    );
  }

  private refresh(state: OrchestrationState): OrchestrationState {
    const timestamp = this.now().toISOString();
    const expiredAssignments = new Set(
      state.leases
        .filter(
          (lease) =>
            lease.releasedAt === null &&
            Date.parse(lease.expiresAt) <= Date.parse(timestamp),
        )
        .map((lease) => lease.assignmentId),
    );
    const assignments = state.assignments.map((assignment) =>
      assignment.status === "active" && expiredAssignments.has(assignment.id)
        ? { ...assignment, status: "expired" as const, endedAt: timestamp }
        : assignment,
    );
    const leases = state.leases.map((lease) =>
      expiredAssignments.has(lease.assignmentId) && lease.releasedAt === null
        ? { ...lease, releasedAt: timestamp }
        : lease,
    );
    const events = [
      ...state.events,
      ...[...expiredAssignments]
        .filter(
          (assignmentId) =>
            !state.events.some(
              (event) =>
                event.type === "lease-expired" &&
                event.assignmentId === assignmentId,
            ),
        )
        .map((assignmentId) => {
          const assignment = state.assignments.find(
            (candidate) => candidate.id === assignmentId,
          )!;
          return {
            id: eventId(this.id()),
            type: "lease-expired" as const,
            workId: assignment.workId,
            assignmentId,
            message: `Lease expired for ${assignmentId}.`,
            createdAt: timestamp,
          };
        }),
    ];
    const completed = new Set(
      state.nodes
        .filter((node) => node.status === "completed")
        .map((node) => node.workId),
    );
    const nodes = state.nodes.map((node) => {
      if (node.status === "completed" || node.status === "canceled")
        return node;
      const active = assignments.some(
        (assignment) =>
          assignment.workId === node.workId && assignment.status === "active",
      );
      if (active)
        return { ...node, status: "active" as const, blockedReasons: [] };
      const reasons = [
        ...node.dependencies
          .filter((dependency) => !completed.has(dependency))
          .map((dependency) => `Dependency ${dependency} is incomplete`),
        ...state.gates
          .filter(
            (gate) => gate.workId === node.workId && gate.status !== "approved",
          )
          .map((gate) => `Approval gate ${gate.id} is ${gate.status}`),
      ];
      return {
        ...node,
        status:
          reasons.length === 0 ? ("ready" as const) : ("blocked" as const),
        blockedReasons: reasons,
      };
    });
    return orchestrationStateSchema.parse({
      ...state,
      nodes,
      assignments,
      leases,
      events,
    });
  }
}
