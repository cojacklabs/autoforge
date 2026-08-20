import path from "node:path";

import { createDefaultAgentRegistry } from "../agents/registry.js";
import { compileProjectContext } from "../commands/context.js";
import { runDoctor } from "../commands/doctor.js";
import { inspectInstallation } from "../commands/init.js";
import { ContextPacketStore } from "../context/store.js";
import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { SessionRecoveryService } from "../guardrails/recovery.js";
import { GuardrailService } from "../guardrails/service.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import { SpecificationFileStore } from "../specifications/store.js";
import {
  createSessionStateStore,
  createWorkStateStore,
} from "../state/kernel.js";
import { WorkRecapService } from "../work/recap.js";
import type { WorkStatus } from "../work/schemas.js";
import {
  tuiViewModelSchema,
  type TuiRow,
  type TuiViewId,
  type TuiViewModel,
} from "./schemas.js";

const STATUS_TONES: Record<WorkStatus, TuiRow["tone"]> = {
  planned: "muted",
  ready: "neutral",
  active: "positive",
  blocked: "negative",
  completed: "positive",
  canceled: "warning",
};

function row(
  label: string,
  value: string | number,
  tone: TuiRow["tone"] = "neutral",
): TuiRow {
  return { label, value: String(value), tone };
}

function unavailable(
  id: TuiViewId,
  title: string,
  status: string,
): TuiViewModel {
  return tuiViewModelSchema.parse({
    id,
    title,
    summary: "This view requires a current AutoForge installation.",
    sections: [
      { title: "Installation", rows: [row("Status", status, "negative")] },
    ],
    commands: ["health", "quit"],
  });
}

export class TuiProjectService {
  constructor(private readonly projectRoot: string) {}

  get projectName(): string {
    return path.basename(this.projectRoot);
  }

  async loadView(id: TuiViewId): Promise<TuiViewModel> {
    if (id === "health") {
      return this.healthView();
    }
    const installation = await inspectInstallation(this.projectRoot);
    if (
      installation.status !== "current" ||
      !installation.work ||
      !installation.session ||
      !installation.decisions ||
      !installation.doctrines ||
      !installation.doctrineSession
    ) {
      return unavailable(id, this.title(id), installation.status);
    }
    const work = installation.work.data;
    let view: TuiViewModel;
    switch (id) {
      case "dashboard": {
        const [doctor, recap, specifications, agents] = await Promise.all([
          runDoctor({ startDirectory: this.projectRoot }),
          new WorkRecapService(
            createWorkStateStore(this.projectRoot),
            createSessionStateStore(this.projectRoot),
          ).read(),
          new SpecificationRegistry(
            new SpecificationFileStore(this.projectRoot),
          ).list(),
          createDefaultAgentRegistry().detect({
            projectRoot: this.projectRoot,
          }),
        ]);
        view = {
          id,
          title: "Dashboard",
          summary: "Project status across the AutoForge application kernel.",
          sections: [
            {
              title: "Work",
              rows: [
                row(
                  "Status",
                  recap.status,
                  recap.status === "active" ? "positive" : "muted",
                ),
                row("Features", recap.inventory.features),
                row("Tasks", recap.inventory.tasks),
                row("Issues", recap.inventory.issues),
              ],
            },
            {
              title: "System",
              rows: [
                row(
                  "Health",
                  doctor.healthy ? "healthy" : "attention required",
                  doctor.healthy ? "positive" : "negative",
                ),
                row("Specifications", specifications.length),
                row(
                  "Detected agents",
                  agents.filter(({ detection }) => detection.detected).length,
                ),
              ],
            },
          ],
          commands: ["active-work", "health", "refresh", "quit"],
        };
        break;
      }
      case "active-work": {
        const recap = await new WorkRecapService(
          createWorkStateStore(this.projectRoot),
          createSessionStateStore(this.projectRoot),
        ).read();
        view = {
          id,
          title: "Active Work",
          summary:
            recap.status === "active"
              ? "The task or issue currently owning the session."
              : "No work currently owns a session.",
          sections:
            recap.status === "active"
              ? [
                  {
                    title: "Current",
                    rows: [
                      row("Kind", recap.active.kind),
                      row("ID", recap.active.id),
                      row("Name", recap.active.name),
                      row("Started", recap.active.startedAt),
                      row("Session", recap.session.id),
                    ],
                  },
                ]
              : [{ title: "Current", rows: [row("Status", "idle", "muted")] }],
          commands: ["context", "session-repair", "refresh", "quit"],
        };
        break;
      }
      case "features":
        view = this.collectionView(
          id,
          "Features",
          "Feature-level work inventory.",
          work.features.map((item) =>
            row(
              item.id,
              `${item.name} [${item.status}]`,
              STATUS_TONES[item.status],
            ),
          ),
        );
        break;
      case "issues":
        view = this.collectionView(
          id,
          "Issues",
          "Project issue inventory.",
          work.issues.map((item) =>
            row(
              item.id,
              `${item.name} [${item.status}]`,
              STATUS_TONES[item.status],
            ),
          ),
        );
        break;
      case "tasks":
        view = this.collectionView(
          id,
          "Tasks",
          "Task inventory across all phases.",
          work.tasks.map((item) =>
            row(
              item.id,
              `${item.name} [${item.status}]`,
              STATUS_TONES[item.status],
            ),
          ),
        );
        break;
      case "decisions":
        view = this.collectionView(
          id,
          "Decisions",
          "Retained architectural decision memory.",
          installation.decisions.data.decisions.map((item) =>
            row(
              item.id,
              `${item.statement} [${item.status}]`,
              item.status === "active" ? "positive" : "muted",
            ),
          ),
        );
        break;
      case "context": {
        if (work.activeWork === null) {
          view = this.collectionView(
            id,
            "Context",
            "Context compilation begins when work is active.",
            [row("Status", "unavailable while idle", "muted")],
            ["active-work", "quit"],
          );
          break;
        }
        const { packet, selection } = await compileProjectContext(
          this.projectRoot,
        );
        const report = await new GuardrailService(this.projectRoot).evaluate({
          work,
          sessions: installation.session.data,
          doctrineSessions: installation.doctrineSession.data,
          doctrines: installation.doctrines.data,
          expectedPacket: packet,
          enforcement: "advisory",
          agentId: "generic",
        });
        const freshness = report.checks.find(
          ({ id: checkId }) => checkId === "context-current",
        );
        view = {
          id,
          title: "Context",
          summary: "Compiled context selection and published packet freshness.",
          sections: [
            {
              title: "Packet",
              rows: [
                row("Work", packet.workId),
                row("Estimated tokens", packet.estimatedTokens),
                row(
                  "Freshness",
                  freshness?.status ?? "unknown",
                  freshness?.status === "pass" ? "positive" : "warning",
                ),
              ],
            },
            {
              title: "Selection",
              rows: [
                row("Doctrines", selection.doctrines.length),
                row("Decisions", selection.decisions.length),
                row("Specifications", selection.specs.length),
                row(
                  "Budget",
                  `${selection.budget.usedTokens}/${selection.budget.maxTokens}`,
                ),
              ],
            },
          ],
          commands: ["context-refresh", "refresh", "quit"],
        };
        break;
      }
      case "specifications": {
        const specifications = await new SpecificationRegistry(
          new SpecificationFileStore(this.projectRoot),
        ).list();
        view = this.collectionView(
          id,
          "Specifications",
          "Typed implementation and design specifications.",
          specifications.map((item) =>
            row(item.id, `${item.name} [${item.type}]`),
          ),
        );
        break;
      }
      case "doctrines":
        view = this.collectionView(
          id,
          "Doctrines",
          "Reusable project guidance selected by the kernel.",
          installation.doctrines.data.doctrines.map((item) =>
            row(
              item.name,
              `${item.title} [${item.status}]`,
              item.status === "active" ? "positive" : "muted",
            ),
          ),
        );
        break;
      case "agents": {
        const registry = createDefaultAgentRegistry();
        const detections = await registry.detect({
          projectRoot: this.projectRoot,
        });
        const rows = await Promise.all(
          detections.map(async ({ adapter, detection }) => {
            const health = await adapter.healthCheck({
              projectRoot: this.projectRoot,
            });
            return row(
              adapter.displayName,
              `${detection.detected ? `detected/${detection.confidence}` : "not detected"}; ${health.status}`,
              health.status === "healthy"
                ? "positive"
                : health.status === "degraded"
                  ? "warning"
                  : "muted",
            );
          }),
        );
        view = this.collectionView(
          id,
          "Agents",
          "Supported agent detection and integration health.",
          rows,
        );
        break;
      }
    }
    return tuiViewModelSchema.parse(view);
  }

  async refreshContext(): Promise<string> {
    const { packet } = await compileProjectContext(this.projectRoot);
    const result = await new ContextPacketStore(this.projectRoot).write(packet);
    return `Published ${packet.id} to ${result.currentPath}.`;
  }

  async repairSession(): Promise<string> {
    const result = await new SessionRecoveryService(this.projectRoot).repair();
    return result.status === "healthy"
      ? "Session state is healthy."
      : result.repairs.join("; ");
  }

  private async healthView(): Promise<TuiViewModel> {
    const doctor = await runDoctor({ startDirectory: this.projectRoot });
    return tuiViewModelSchema.parse({
      id: "health",
      title: "Health",
      summary: doctor.healthy
        ? "All required system checks pass."
        : "One or more system checks require attention.",
      sections: [
        {
          title: "Doctor",
          rows: doctor.checks.map((check) =>
            row(
              check.id,
              check.message,
              check.status === "pass"
                ? "positive"
                : check.status === "warning"
                  ? "warning"
                  : "negative",
            ),
          ),
        },
      ],
      commands: ["dashboard", "refresh", "quit"],
    });
  }

  private collectionView(
    id: TuiViewId,
    title: string,
    summary: string,
    rows: TuiRow[],
    commands: string[] = ["dashboard", "refresh", "quit"],
  ): TuiViewModel {
    return {
      id,
      title,
      summary,
      sections: [
        {
          title: title,
          rows: rows.length > 0 ? rows : [row("Inventory", "empty", "muted")],
        },
      ],
      commands,
    };
  }

  private title(id: TuiViewId): string {
    return id
      .split("-")
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join(" ");
  }
}

export function assertTuiProjectRoot(projectRoot: string | undefined): string {
  if (!projectRoot) {
    throw new AutoForgeError(
      "PROJECT_NOT_FOUND",
      "The TUI requires a discoverable project root",
      { exitCode: EXIT_CODE.notFound },
    );
  }
  return projectRoot;
}
