import path from "node:path";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { globSync } from "glob";
import yaml from "yaml";
import { RunStore } from "./run_store.js";
import { TelemetryCollector } from "./telemetry_collector.js";

export class OrchestratorKernel {
  /**
   * @param {Object} [options]
   * @param {string} [options.projectRoot]
   * @param {RunStore} [options.runStore]
   * @param {TelemetryCollector} [options.telemetry]
   */
  constructor({ projectRoot = process.cwd(), runStore, telemetry } = {}) {
    this.projectRoot = projectRoot;
    this.runStore = runStore || new RunStore();
    this.telemetry =
      telemetry || new TelemetryCollector({ projectRoot: this.projectRoot });
  }

  /**
   * Load recipe by name or default to web_app
   * @param {string} [name]
   */
  loadRecipe(name) {
    const recipesDir = path.join(
      this.projectRoot,
      "docs",
      "blueprint",
      "recipes",
    );
    const patterns = [
      path.join(recipesDir, "*.yaml"),
      path.join(recipesDir, "*.yml"),
    ];
    const files = patterns.flatMap((p) => globSync(p, { nodir: true }));
    if (name) {
      for (const f of files) {
        if (path.basename(f).replace(/\.(ya?ml)$/i, "") === name) {
          return { file: f, recipe: yaml.parse(fs.readFileSync(f, "utf8")) };
        }
      }
    }
    const candidate = files.find((f) => /web_app\.ya?ml$/i.test(f)) || files[0];
    if (!candidate) return null;
    return {
      file: candidate,
      recipe: yaml.parse(fs.readFileSync(candidate, "utf8")),
    };
  }

  /**
   * Dry-run analysis for a recipe
   * @param {string} [recipeName]
   */
  async dryRun(recipeName) {
    const loaded = this.loadRecipe(recipeName);
    if (!loaded) {
      throw new Error(`No recipe found matching "${recipeName || "default"}"`);
    }

    const { recipe, file } = loaded;
    const stages = Array.isArray(recipe.stages) ? recipe.stages : [];

    // Preflight checks
    const checks = [
      {
        id: "ideas",
        label: "Idea intake files present",
        pattern: path.join(this.projectRoot, "ideas", "*.yaml"),
      },
      {
        id: "prd",
        label: "Product Requirements Document (PRD)",
        path: path.join(
          this.projectRoot,
          "docs",
          "prd",
          "PRODUCT_REQUIREMENTS.md",
        ),
      },
      {
        id: "api",
        label: "API Contract (OpenAPI)",
        path: path.join(this.projectRoot, "api", "openapi.yaml"),
      },
    ];

    const preflight = checks.map((c) => {
      let ok = false;
      if (c.path) ok = fs.existsSync(c.path);
      else if (c.pattern) ok = globSync(c.pattern, { nodir: true }).length > 0;
      return { id: c.id, label: c.label, status: ok ? "passed" : "missing" };
    });

    const executionPlan = stages.map((s, index) => ({
      step: index + 1,
      id: s.id,
      role: s.role,
      inputs: s.inputs || [],
      deliverables: s.deliverables || [],
      approvals: s.approvals || [],
    }));

    return {
      recipeName: recipe.name || path.basename(file),
      file: path.relative(this.projectRoot, file),
      preflight,
      executionPlan,
      ciTemplates: recipe.ci_templates || [],
    };
  }

  /**
   * Initialize a new execution run
   * @param {Object} params
   * @param {string} params.title
   * @param {string} params.objective
   * @param {'R0'|'R1'|'R2'|'R3'} [params.riskTier]
   * @param {number} [params.autonomyLevel]
   * @param {string} [params.recipeName]
   * @param {string} [params.owner]
   */
  startRun({
    title,
    objective,
    riskTier = "R1",
    autonomyLevel = 1,
    recipeName = "web_app",
    owner = "developer",
  }) {
    const timestamp = Date.now();
    const workItemId = `WI-${timestamp}`;
    const runId = `RUN-${timestamp}`;

    // 1. Create Work Item
    this.runStore.createWorkItem({
      id: workItemId,
      title,
      objective,
      riskTier,
      state: "ready_for_planning",
      owner,
      acceptanceCriteria: [],
      linkedArtifacts: [],
    });

    // 2. Create Run Record
    this.runStore.createRun({
      id: runId,
      workItemId,
      recipeName,
      autonomyLevel,
      status: "pending",
    });

    // 3. Record Start Event
    this.runStore.recordEvent({
      id: `EVT-${timestamp}-start`,
      runId,
      type: "run_initialized",
      payload: { workItemId, recipeName, autonomyLevel, riskTier },
    });

    // 4. Record Telemetry
    this.telemetry.record({
      runId,
      type: "run_initialized",
      workItemId,
      recipeName,
      autonomyLevel,
      riskTier,
    });

    return { workItemId, runId };
  }

  /**
   * Resolve an approval request
   * @param {string} approvalId
   * @param {'approved'|'rejected'} status
   * @param {string} [approver]
   * @param {string} [note]
   */
  resolveApproval(approvalId, status, approver = "developer", note = "") {
    this.runStore.resolveApproval(approvalId, approver, status, note);
    this.telemetry.record({
      type: "approval_resolved",
      approvalId,
      status,
      approver,
      note,
    });
  }

  /**
   * Get status snapshot for a run
   * @param {string} runId
   */
  getStatus(runId) {
    const run = this.runStore.getRun(runId);
    if (!run) return null;
    const workItem = this.runStore.getWorkItem(run.workItemId);
    const pendingApprovals = this.runStore.getPendingApprovals(runId);
    return {
      run,
      workItem,
      pendingApprovals,
    };
  }
}
