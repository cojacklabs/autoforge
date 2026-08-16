import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export class RunStore {
  /**
   * @param {string} [customPath]
   */
  constructor(customPath) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const projectRoot = process.cwd();
      const runtimeDir = path.join(projectRoot, ".autoforge", "runtime");
      if (!fs.existsSync(runtimeDir)) {
        fs.mkdirSync(runtimeDir, { recursive: true });
      }
      this.dbPath = path.join(runtimeDir, "autoforge.db");
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS work_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        risk_tier TEXT NOT NULL CHECK(risk_tier IN ('R0', 'R1', 'R2', 'R3')),
        state TEXT NOT NULL,
        owner TEXT NOT NULL,
        acceptance_criteria TEXT NOT NULL, -- JSON array
        linked_artifacts TEXT NOT NULL,   -- JSON array
        metadata TEXT,                     -- JSON object
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        work_item_id TEXT NOT NULL,
        recipe_name TEXT NOT NULL,
        autonomy_level INTEGER NOT NULL CHECK(autonomy_level IN (0, 1, 2, 3)),
        status TEXT NOT NULL,
        current_step_id TEXT,
        error TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS steps (
        id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        input_payload TEXT,
        output_payload TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        error TEXT,
        started_at TEXT,
        completed_at TEXT,
        PRIMARY KEY (id, run_id),
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS gate_results (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT,
        gate_type TEXT NOT NULL,
        passed INTEGER NOT NULL,
        command TEXT,
        evidence TEXT,
        error_context TEXT,
        executed_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT,
        decision_class TEXT NOT NULL,
        actor TEXT NOT NULL,
        rationale TEXT NOT NULL,
        confidence REAL,
        policy_outcome TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT,
        decision_class TEXT NOT NULL,
        scope TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        approver TEXT,
        note TEXT,
        conditions TEXT, -- JSON array
        expires_at TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL, -- JSON object
        timestamp TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      );
    `);
  }

  getDbPath() {
    return this.dbPath;
  }

  close() {
    this.db.close();
  }

  // Work Items
  createWorkItem(item) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO work_items (id, title, objective, risk_tier, state, owner, acceptance_criteria, linked_artifacts, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      item.id,
      item.title,
      item.objective,
      item.riskTier,
      item.state,
      item.owner,
      JSON.stringify(item.acceptanceCriteria || []),
      JSON.stringify(item.linkedArtifacts || []),
      item.metadata ? JSON.stringify(item.metadata) : null,
      now,
      now
    );
  }

  getWorkItem(id) {
    const stmt = this.db.prepare(`SELECT * FROM work_items WHERE id = ?`);
    const row = stmt.get(id);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      objective: row.objective,
      riskTier: row.risk_tier,
      state: row.state,
      owner: row.owner,
      acceptanceCriteria: JSON.parse(row.acceptance_criteria),
      linkedArtifacts: JSON.parse(row.linked_artifacts),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  updateWorkItemState(id, state) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`UPDATE work_items SET state = ?, updated_at = ? WHERE id = ?`);
    stmt.run(state, now, id);
  }

  // Runs
  createRun(run) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO runs (id, work_item_id, recipe_name, autonomy_level, status, started_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      run.id,
      run.workItemId,
      run.recipeName,
      run.autonomyLevel,
      run.status || 'pending',
      now,
      now,
      now
    );
  }

  getRun(id) {
    const stmt = this.db.prepare(`SELECT * FROM runs WHERE id = ?`);
    const row = stmt.get(id);
    if (!row) return null;
    return {
      id: row.id,
      workItemId: row.work_item_id,
      recipeName: row.recipe_name,
      autonomyLevel: row.autonomy_level,
      status: row.status,
      currentStepId: row.current_step_id,
      error: row.error,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  updateRunStatus(id, status, error) {
    const now = new Date().toISOString();
    let query = `UPDATE runs SET status = ?, updated_at = ?`;
    const params = [status, now];
    if (error !== undefined) {
      query += `, error = ?`;
      params.push(error);
    }
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      query += `, completed_at = ?`;
      params.push(now);
    }
    query += ` WHERE id = ?`;
    params.push(id);
    const stmt = this.db.prepare(query);
    stmt.run(...params);
  }

  // Approvals
  createApproval(approval) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO approvals (id, run_id, step_id, decision_class, scope, status, requested_by, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `);
    stmt.run(
      approval.id,
      approval.runId,
      approval.stepId || null,
      approval.decisionClass,
      approval.scope,
      approval.requestedBy,
      approval.expiresAt || null,
      now
    );
  }

  resolveApproval(id, approver, status, note) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE approvals SET status = ?, approver = ?, note = ?, resolved_at = ? WHERE id = ?
    `);
    stmt.run(status, approver, note || null, now, id);
  }

  getPendingApprovals(runId) {
    const stmt = this.db.prepare(`SELECT * FROM approvals WHERE run_id = ? AND status = 'pending'`);
    const rows = stmt.all(runId);
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      stepId: r.step_id,
      decisionClass: r.decision_class,
      scope: r.scope,
      status: r.status,
      requestedBy: r.requested_by,
      approver: r.approver,
      note: r.note,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }));
  }

  // Gate Results
  recordGateResult(result) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO gate_results (id, run_id, step_id, gate_type, passed, command, evidence, error_context, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      result.id,
      result.runId,
      result.stepId || null,
      result.gateType,
      result.passed ? 1 : 0,
      result.command || null,
      result.evidence ? JSON.stringify(result.evidence) : null,
      result.errorContext || null,
      now
    );
  }

  // Events
  recordEvent(event) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO events (id, run_id, type, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(event.id, event.runId, event.type, JSON.stringify(event.payload), now);
  }
}
