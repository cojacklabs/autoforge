import path from "node:path";
import fs from "node:fs";

/**
 * TelemetryCollector (v1)
 *
 * Captures lifecycle orchestration events, gate results, token usage,
 * and retry counts, streaming them to .autoforge/training/telemetry.jsonl.
 */
export class TelemetryCollector {
  /**
   * @param {Object} [options]
   * @param {string} [options.projectRoot]
   * @param {string} [options.customPath]
   */
  constructor({ projectRoot = process.cwd(), customPath } = {}) {
    this.projectRoot = projectRoot;
    if (customPath) {
      this.telemetryPath = customPath;
    } else {
      const trainingDir = path.join(this.projectRoot, ".autoforge", "training");
      if (!fs.existsSync(trainingDir)) {
        fs.mkdirSync(trainingDir, { recursive: true });
      }
      this.telemetryPath = path.join(trainingDir, "telemetry.jsonl");
    }

    const dir = path.dirname(this.telemetryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Record a telemetry event to the JSONL log
   * @param {Object} event
   */
  record(event) {
    const entry = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    fs.appendFileSync(this.telemetryPath, JSON.stringify(entry) + "\n", "utf8");
  }

  /**
   * Read all recorded telemetry events
   * @returns {Array<Object>}
   */
  readAll() {
    if (!fs.existsSync(this.telemetryPath)) {
      return [];
    }
    const content = fs.readFileSync(this.telemetryPath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Calculate aggregated metrics from telemetry history
   */
  computeMetrics() {
    const events = this.readAll();
    const runs = new Set();
    let totalGates = 0;
    let passedGates = 0;
    let failedGates = 0;
    let totalRetries = 0;
    let totalTokens = 0;
    let humanApprovals = 0;

    const gateFailureTypes = {};

    for (const e of events) {
      if (e.runId) runs.add(e.runId);

      if (e.type === "gate_evaluation") {
        totalGates++;
        if (e.passed) {
          passedGates++;
        } else {
          failedGates++;
          const gType = e.gateType || "unknown";
          gateFailureTypes[gType] = (gateFailureTypes[gType] || 0) + 1;
        }
      }

      if (e.type === "agent_complete") {
        totalRetries += e.retries || 0;
        if (e.tokens) {
          totalTokens += (e.tokens.promptTokens || 0) + (e.tokens.completionTokens || 0);
        }
      }

      if (e.type === "approval_resolved") {
        humanApprovals++;
      }
    }

    const firstPassGateRate = totalGates > 0 ? (passedGates / totalGates) * 100 : 100;

    return {
      totalRuns: runs.size,
      totalEvents: events.length,
      totalGates,
      passedGates,
      failedGates,
      firstPassGateRate: Math.round(firstPassGateRate * 10) / 10,
      totalRetries,
      totalTokens,
      humanApprovals,
      gateFailureTypes,
    };
  }

  /**
   * Analyze recurring failure patterns and generate prompt/policy improvement suggestions
   * @param {number} [lastN=10]
   */
  generateSuggestions(lastN = 10) {
    const events = this.readAll();
    const recent = events.slice(-Math.max(lastN * 10, 50));
    const suggestions = [];

    // Count gate failures
    const failures = {};
    for (const e of recent) {
      if (e.type === "gate_evaluation" && !e.passed) {
        const key = `${e.role || "unknown"}:${e.gateType || "general"}`;
        failures[key] = (failures[key] || 0) + 1;
      }
    }

    for (const [key, count] of Object.entries(failures)) {
      const [role, gateType] = key.split(":");
      if (count >= 2) {
        suggestions.push({
          targetRole: role,
          gateType,
          failureCount: count,
          recommendation: `Add explicit pre-flight validation instructions for '${gateType}' into the '${role}' prompt template.`,
          proposedPatch: {
            role,
            section: "quality_checks",
            enforceRules: [`Ensure code satisfies strict '${gateType}' checks before handoff.`],
          },
        });
      }
    }

    return suggestions;
  }
}
