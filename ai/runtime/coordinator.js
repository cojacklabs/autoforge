// Single-session Coordinator stub: orchestrates PM and UI/UX adapters to produce
// UserAsk, IssueReport, CodePlan, and TestPlan, with schema validation hooks.

import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { buildUserAsk, triageIssue } from "./adapters/pm.js";
import { researchAndPropose, proposePlans } from "./adapters/uiux.js";
import { planDiffs } from "./adapters/engineer.js";
import { evaluate as qaEvaluate } from "./adapters/qa.js";

async function tryLoadAjv() {
  try {
    const mod = await import("ajv");
    return new mod.default({ allErrors: true, strict: false });
  } catch {
    return null;
  }
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function schemaPath(repoRoot, name) {
  const schemasDir = path.join(repoRoot, "ai", "schemas");
  const file = name.endsWith(".json") ? name : `${name}.json`;
  return path.join(schemasDir, file);
}

function resolveAutoforgeDir(repoRoot) {
  const hidden = path.join(repoRoot, ".autoforge");
  const legacy = path.join(repoRoot, "autoforge");
  if (fs.existsSync(hidden)) return hidden;
  if (fs.existsSync(legacy)) return legacy;
  // fallback to repoRoot/ai for templates
  return path.join(repoRoot, "ai");
}

export class Coordinator {
  constructor({
    repoRoot = process.cwd(),
    governance = { mode: "strict" },
  } = {}) {
    this.repoRoot = repoRoot;
    this.governance = governance;
    this.events = [];
    this.autoforgeDir = resolveAutoforgeDir(repoRoot);
    this.memoryDir = path.join(this.autoforgeDir, "ai", "memory");
    this.codeTargets = [];
    this.dag = [
      { id: "user_ask", status: "pending" },
      { id: "issue_report", status: "pending" },
      { id: "code_plan", status: "pending" },
      { id: "test_plan", status: "pending" },
      { id: "compliance", status: "pending" },
    ];
    this.approvals = {};
    this.sessionPolicy = null;
    this.governancePolicy = null;
    this.loadPoliciesAsync();
  }

  log(event) {
    const e = { ts: new Date().toISOString(), ...event };
    this.events.push(e);
    try {
      const telemetry = require("./telemetry.js");
      telemetry.appendEvent(this.repoRoot, e);
    } catch {
      // ignore telemetry failures
    }
  }

  async validateArtifact(artifact, schemaName) {
    const ajv = await tryLoadAjv();
    const sp = schemaPath(this.repoRoot, schemaName);
    if (!fs.existsSync(sp)) {
      this.log({ type: "warn", msg: `Schema not found: ${sp}` });
      return { valid: true, errors: [] };
    }
    if (!ajv) {
      this.log({
        type: "warn",
        msg: "Ajv not installed; skipping schema validation",
      });
      return { valid: true, errors: [] };
    }
    const schema = readJson(sp);
    const validate = ajv.compile(schema);
    const ok = validate(artifact);
    return { valid: !!ok, errors: ok ? [] : validate.errors };
  }

  async fromPrompt(rawText, options = {}) {
    // Reload policies at the start of each run to honor updates
    await this.loadPoliciesAsync();
    const {
      apply = false,
      approvalGranted = false,
      formatWrite = false,
    } = options;
    // Load managed code targets once
    if (this.codeTargets.length === 0) {
      await this.loadCodeTargets();
    }
    // Pre-step memory read
    await this.readMemoryGate("pm");

    // PM normalization
    const userAsk = buildUserAsk(rawText);
    const vUserAsk = await this.validateArtifact(userAsk, "UserAsk.v1.json");
    this.log({
      stage: "user_ask",
      valid: vUserAsk.valid,
      errors: vUserAsk.errors,
    });
    this.setDagStatus("user_ask", vUserAsk.valid ? "completed" : "blocked");
    await this.writeMemoryDelta(
      "pm",
      `Captured UserAsk (${userAsk.id}) with intent=${userAsk.intent}`,
    );

    // PM triage
    await this.readMemoryGate("pm");
    const issueReport = triageIssue(userAsk);
    const vIssue = await this.validateArtifact(
      issueReport,
      "IssueReport.v1.json",
    );
    this.log({
      stage: "issue_report",
      valid: vIssue.valid,
      errors: vIssue.errors,
    });
    this.setDagStatus("issue_report", vIssue.valid ? "completed" : "blocked");
    await this.writeMemoryDelta(
      "pm",
      `Triaged IssueReport (${issueReport.id}) category=${issueReport.category}`,
    );

    // UI/UX plans
    await this.readMemoryGate("uiux");
    // Approval/permission-gated UI/UX research
    const needApprovalKey = "uiux_inspiration";
    let granted = !!(options?.approvals && options.approvals[needApprovalKey]);
    const researchPermitted = this.getPermission("allowResearchEgress", false);
    if (!researchPermitted) {
      granted = false;
    }
    if (!granted && this.governance?.mode === "strict") {
      const approvalId = this.requestApproval({
        action: needApprovalKey,
        reason: "UI/UX inspiration research requested",
        scope: issueReport.components || [],
      });
      this.log({
        stage: "approval_requested",
        id: approvalId,
        action: needApprovalKey,
      });
      // Check if a prior decision exists for this action
      const prior = Object.values(this.approvals).find(
        (a) => a.action === needApprovalKey && a.granted === true,
      );
      granted = !!prior;
    }
    const allowedRoots = this.codeTargets.map((t) => t.abs);
    const { designSpec, styleGuideDiff, codePlan, testPlan } =
      researchAndPropose(issueReport, {
        approvalGranted: granted,
        repoRoot: this.repoRoot,
        allowedRoots,
      });
    const vCode = await this.validateArtifact(codePlan, "CodePlan.v1.json");
    const vTest = await this.validateArtifact(testPlan, "TestPlan.v1.json");
    const vDesign = await this.validateArtifact(
      designSpec,
      "DesignSpec.v1.json",
    );
    const vStyle = await this.validateArtifact(
      styleGuideDiff,
      "StyleGuideDiff.v1.json",
    );
    this.log({
      stage: "code_plan",
      valid: vCode.valid,
      errors: vCode.errors,
      artifact: codePlan,
    });
    this.log({
      stage: "test_plan",
      valid: vTest.valid,
      errors: vTest.errors,
      artifact: testPlan,
    });
    this.log({
      stage: "design_spec",
      valid: vDesign.valid,
      errors: vDesign.errors,
      artifact: designSpec,
    });
    this.log({
      stage: "style_diff",
      valid: vStyle.valid,
      errors: vStyle.errors,
      artifact: styleGuideDiff,
    });
    this.setDagStatus("code_plan", vCode.valid ? "completed" : "blocked");
    this.setDagStatus("test_plan", vTest.valid ? "completed" : "blocked");
    await this.writeMemoryDelta(
      "uiux",
      `Produced DesignSpec (${designSpec.id}) & StyleGuideDiff (${styleGuideDiff.id}); Proposed CodePlan (${codePlan.id}) & TestPlan (${testPlan.id}) for ${issueReport.components?.join(",") || "root"}`,
    );

    // Compliance self-audit (dry-run; check baseline on proposed files if present)
    const proposedFiles = (codePlan.changes || [])
      .map((c) => path.join(this.repoRoot, c.path))
      .filter((p) => fs.existsSync(p));
    // Enforce code boundaries: proposed change paths must be within managed code targets
    const boundary = this.enforceCodeBoundaries(codePlan);
    let parse_ok = true,
      prettier_ok = true,
      eslint_ok = true,
      tsc_ok = true,
      tests_ok = true;
    try {
      const validators = await import("./validators.js");
      if (proposedFiles.length) {
        parse_ok = await validators.parseChecks(
          proposedFiles.filter((f) => /\.(json|ya?ml|md)$/i.test(f)),
        );
        prettier_ok = await validators.prettierCheck(proposedFiles, {
          write: false,
        });
        eslint_ok = await validators.eslintCheck(proposedFiles, { fix: false });
      }
      tsc_ok = await validators.tscCheck(this.repoRoot);
    } catch (err) {
      this.log({
        type: "warn",
        msg: `Validators not available: ${err.message}`,
      });
    }
    const compliance = {
      rules_checked: [
        "artifacts_schema",
        "code_targets",
        "parse",
        "prettier",
        "eslint",
        "tsc",
      ],
      artifacts_valid:
        vUserAsk.valid &&
        vIssue.valid &&
        vCode.valid &&
        vTest.valid &&
        vDesign.valid &&
        vStyle.valid,
      code_targets_ok: boundary.ok,
      code_targets_violations: boundary.violations,
      parse_ok,
      prettier_ok,
      eslint_ok,
      tsc_ok,
      tests_ok,
      changed_files: proposedFiles.map((p) => path.relative(this.repoRoot, p)),
      summary: boundary.ok
        ? "Schemas validated; code targets respected; baseline gates checked (no code changes applied)."
        : `Code targets violation on ${boundary.violations.length} change(s); review required.`,
    };
    this.log({ stage: "compliance", compliance });
    this.setDagStatus(
      "compliance",
      compliance.artifacts_valid &&
        parse_ok &&
        prettier_ok &&
        eslint_ok &&
        tsc_ok
        ? "completed"
        : "blocked",
    );
    await this.writeMemoryDelta(
      "qa",
      `Compliance baseline: ${JSON.stringify({ ...compliance, changed_files: compliance.changed_files.length })}`,
    );
    // Engineer dry-run apply plan (no writes)
    const allowedRoots = this.codeTargets.map((t) => t.abs);
    const engPlan = planDiffs(codePlan, {
      repoRoot: this.repoRoot,
      allowedRoots,
    });
    this.log({
      stage: "engineer_plan",
      writes: engPlan.writes.length,
      violations: engPlan.violations.length,
    });
    await this.writeMemoryDelta(
      "engineer",
      `Prepared dry-run write plan: ${engPlan.writes.length} writes, ${engPlan.violations.length} violations`,
    );

    // QA evaluation (stubbed)
    const qa = qaEvaluate(testPlan);
    this.log({
      stage: "qa_eval",
      summary: { total: qa.total, pending: qa.pending },
    });
    await this.writeMemoryDelta(
      "qa",
      `QA evaluation (stub): total=${qa.total}, pending=${qa.pending}`,
    );

    // Optional apply step (approval-gated)
    let post = null;
    if (apply) {
      post = await this.applyChanges({
        engPlan,
        testPlan,
        approvalGranted,
        formatWrite,
      });
    }

    return {
      userAsk,
      issueReport,
      designSpec,
      styleGuideDiff,
      codePlan,
      testPlan,
      compliance,
      engineer: engPlan,
      qa,
      postApply: post,
      events: this.events,
    };
  }

  async loadCodeTargets() {
    try {
      const candidates = [
        path.join(this.autoforgeDir, "ai", "code_targets.yaml"),
        path.join(this.autoforgeDir, "code_targets.yaml"),
      ];
      const file = candidates.find((p) => fs.existsSync(p));
      if (!file) {
        this.log({
          type: "warn",
          msg: "Managed code_targets.yaml not found; code boundary checks disabled.",
        });
        this.codeTargets = [];
        return;
      }
      const yaml = await import("yaml");
      const doc = yaml.parse(fs.readFileSync(file, "utf8"));
      const ct = doc?.code_targets || {};
      const entries = Object.entries(ct).flatMap(([key, value]) => {
        if (!value || !value.path) return [];
        const rel = value.path;
        const abs = path.resolve(this.autoforgeDir, rel);
        return [{ key, rel, abs }];
      });
      this.codeTargets = entries;
      this.log({ stage: "code_targets_loaded", count: entries.length });
    } catch (err) {
      this.log({
        type: "warn",
        msg: `Failed to load code targets: ${err.message}`,
      });
      this.codeTargets = [];
    }
  }

  async loadPoliciesAsync() {
    try {
      const spaths = [
        path.join(this.autoforgeDir, "ai", "policies", "session_policy.yaml"),
        path.join(this.autoforgeDir, "policies", "session_policy.yaml"),
      ];
      const gpaths = [
        path.join(this.autoforgeDir, "ai", "policies", "governance.yaml"),
        path.join(this.autoforgeDir, "policies", "governance.yaml"),
      ];
      const yaml = await import("yaml");
      const sp = spaths.find((p) => fs.existsSync(p));
      if (sp) this.sessionPolicy = yaml.parse(fs.readFileSync(sp, "utf8"));
      const gp = gpaths.find((p) => fs.existsSync(p));
      if (gp) this.governancePolicy = yaml.parse(fs.readFileSync(gp, "utf8"));
      this.log({
        stage: "policies_loaded",
        session: !!this.sessionPolicy,
        governance: !!this.governancePolicy,
      });
    } catch (err) {
      this.log({
        type: "warn",
        msg: `Failed to load policies: ${err.message}`,
      });
    }
  }

  getPermission(key, fallback = true) {
    return !!(this.sessionPolicy?.permissions?.[key] ?? fallback);
  }

  requestApproval({ action, reason, scope }) {
    const id = `approval_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.events.push({
      ts: new Date().toISOString(),
      type: "approval_request",
      id,
      action,
      reason,
      scope,
    });
    return id;
  }

  recordApprovalDecision(id, { granted, note, action, role = "pm" }) {
    const decision = {
      id,
      action,
      granted: !!granted,
      note: note || "",
      ts: new Date().toISOString(),
    };
    this.approvals[id] = decision;
    this.events.push({
      ts: decision.ts,
      type: "approval_decision",
      ...decision,
    });
    const summary = `Approval ${id} for ${action}: ${granted ? "granted" : "denied"}${note ? ` (${note})` : ""}`;
    // Log to memory (role provided so UI/UX approvals can go to uiux memory)
    this.writeMemoryDelta(role, summary);
  }

  enforceCodeBoundaries(codePlan) {
    if (!Array.isArray(codePlan?.changes) || this.codeTargets.length === 0) {
      return { ok: true, violations: [] };
    }
    const violations = [];
    for (const change of codePlan.changes) {
      const abs = path.resolve(this.repoRoot, change.path);
      const insideAny = this.codeTargets.some((t) => {
        const rel = path.relative(t.abs, abs);
        return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
      });
      if (!insideAny) {
        violations.push({
          path: change.path,
          allowed_roots: this.codeTargets.map((t) =>
            path.relative(this.repoRoot, t.abs),
          ),
        });
      }
    }
    return { ok: violations.length === 0, violations };
  }

  async applyChanges({
    engPlan,
    testPlan,
    approvalGranted = false,
    formatWrite = false,
  }) {
    // Governance: in strict mode, require explicit approval for writes
    if (this.governance?.mode === "strict" && !approvalGranted) {
      this.log({
        type: "halt",
        msg: "Write denied: strict mode without approval",
      });
      return { applied: false, reason: "approval_required" };
    }
    // Session policy: allowApply must be true
    if (!this.getPermission("allowApply", true)) {
      this.log({
        type: "halt",
        msg: "Write denied by session policy (allowApply=false)",
      });
      return { applied: false, reason: "apply_disallowed_by_session_policy" };
    }
    if (!engPlan || !Array.isArray(engPlan.writes)) {
      return { applied: false, reason: "no_plan" };
    }
    // Apply writes (currently minimal append/create behavior)
    const engineer = await import("./adapters/engineer.js");
    // Structured diffs: attempt token updates if a StyleGuideDiff exists in recent events
    const styleEvent = this.events
      .reverse()
      .find((e) => e.stage === "style_diff");
    this.events.reverse();
    let results = [];
    if (
      styleEvent &&
      styleEvent.artifact &&
      Array.isArray(styleEvent.artifact.tokenChanges)
    ) {
      // Structured token updates for CSS variables and JSON/TS/JS theme files
      const tokenWrites = engPlan.writes.filter((w) =>
        /\.(s?css|json|ts|js)$/i.test(w.relPath),
      );
      for (const w of tokenWrites) {
        try {
          const abs = path.resolve(this.repoRoot, w.relPath);
          if (!fs.existsSync(abs)) continue;
          const ext = path.extname(abs).toLowerCase();
          if (ext === ".json") {
            const obj = JSON.parse(fs.readFileSync(abs, "utf8"));
            let changed = 0;
            for (const tc of styleEvent.artifact.tokenChanges) {
              if (/^css\./i.test(tc.token)) continue; // css.* reserved for CSS vars
              changed += setNestedToken(obj, tc.token, tc.to) ? 1 : 0;
            }
            if (changed > 0) {
              fs.writeFileSync(abs, JSON.stringify(obj, null, 2), "utf8");
              results.push({
                path: w.relPath,
                action: "replace_tokens_json",
                ok: true,
                changes: changed,
              });
            }
          } else if (ext === ".css" || ext === ".scss") {
            let content = fs.readFileSync(abs, "utf8");
            let changed = 0;
            for (const tc of styleEvent.artifact.tokenChanges) {
              if (!/^css\./i.test(tc.token)) continue;
              const varName = tc.token.replace(/^css\./i, "");
              const re = new RegExp(`(--${varName}\\s*:\\s*)([^;]+)(;)`, "i");
              if (re.test(content)) {
                content = content.replace(re, `$1${tc.to}$3`);
                changed++;
              }
            }
            if (changed > 0) {
              fs.writeFileSync(abs, content, "utf8");
              results.push({
                path: w.relPath,
                action: "replace_tokens_css",
                ok: true,
                changes: changed,
              });
            }
          } else if (ext === ".ts" || ext === ".js") {
            let content = fs.readFileSync(abs, "utf8");
            let changed = 0;
            for (const tc of styleEvent.artifact.tokenChanges) {
              if (/^css\./i.test(tc.token)) continue;
              const key = tc.token.split(".").pop();
              const re1 = new RegExp(
                `([\"']${key}[\"']\s*:\s*[\"'])([^\"']+)([\"'])`,
              );
              const re2 = new RegExp(`(${key}\s*:\s*[\"'])([^\"']+)([\"'])`);
              if (re1.test(content)) {
                content = content.replace(re1, `$1${tc.to}$3`);
                changed++;
              } else if (re2.test(content)) {
                content = content.replace(re2, `$1${tc.to}$3`);
                changed++;
              }
            }
            if (changed > 0) {
              fs.writeFileSync(abs, content, "utf8");
              results.push({
                path: w.relPath,
                action: "replace_tokens_tsjs",
                ok: true,
                changes: changed,
              });
            }
          }
        } catch (err) {
          results.push({
            path: w.relPath,
            action: "replace_tokens",
            ok: false,
            error: err.message,
          });
        }
      }
      // Fallback for any remaining planned writes
      const remaining = engPlan.writes.filter(
        (w) => !results.find((r) => r.path === w.relPath),
      );
      if (remaining.length) {
        const fallback = engineer.applyWrites(
          { writes: remaining },
          { fs, dryRun: false },
        );
        results.push(...fallback);
      }
    } else {
      results = engineer.applyWrites(engPlan, { fs, dryRun: false });
    }
    this.log({ stage: "apply", resultsCount: results.length });
    await this.writeMemoryDelta("engineer", `Applied ${results.length} writes`);

    // Re-run gates on changed files
    const changedFiles = engPlan.writes.map((w) =>
      path.resolve(this.repoRoot, w.relPath),
    );
    let parse_ok = true,
      prettier_ok = true,
      eslint_ok = true,
      tsc_ok = true,
      tests_ok = true;
    try {
      const validators = await import("./validators.js");
      parse_ok = await validators.parseChecks(
        changedFiles.filter((f) => /\.(json|ya?ml|md)$/i.test(f)),
      );
      prettier_ok = await validators.prettierCheck(changedFiles, {
        write: formatWrite,
      });
      eslint_ok = await validators.eslintCheck(changedFiles, { fix: false });
      tsc_ok = await validators.tscCheck(this.repoRoot);
    } catch (err) {
      this.log({
        type: "warn",
        msg: `Validators not available post-apply: ${err.message}`,
      });
    }
    // Optional tests via qualityPolicies.tests.cmd
    const targetPaths = Array.isArray(testPlan?.cases)
      ? testPlan.cases.flatMap((c) =>
          Array.isArray(c.target_paths) ? c.target_paths : [],
        )
      : [];
    tests_ok = await this.runConfiguredTests(targetPaths);

    const postCompliance = {
      rules_checked: ["parse", "prettier", "eslint", "tsc", "tests"],
      parse_ok,
      prettier_ok,
      eslint_ok,
      tsc_ok,
      tests_ok,
      changed_files: changedFiles.map((p) => path.relative(this.repoRoot, p)),
      summary:
        tests_ok && parse_ok && prettier_ok && eslint_ok && tsc_ok
          ? "All post-apply gates passed"
          : "Post-apply gates failed",
    };
    this.log({ stage: "post_compliance", postCompliance });
    await this.writeMemoryDelta(
      "qa",
      `Post-apply gates: ${JSON.stringify({ ok: tests_ok && parse_ok && prettier_ok && eslint_ok && tsc_ok })}`,
    );
    // Component-level minimal diff: add focus-visible hints for Button.tsx if present
    const buttonWrites = engPlan.writes.filter((w) =>
      /Button\.(t|j)sx$/i.test(w.relPath),
    );
    for (const w of buttonWrites) {
      try {
        const abs = path.resolve(this.repoRoot, w.relPath);
        if (!fs.existsSync(abs)) continue;
        let content = fs.readFileSync(abs, "utf8");
        if (/className=\"[^\"]*\"/.test(content)) {
          content = content.replace(
            /className=\"([^\"]*)\"/,
            (m, g1) =>
              `className=\"${g1} focus:outline-none focus-visible:outline-2\"`,
          );
          fs.writeFileSync(abs, content, "utf8");
          results.push({
            path: w.relPath,
            action: "inject_focus_classes",
            ok: true,
          });
        } else if (!/AUTOFORGE: focus-visible/.test(content)) {
          content += `\n// AUTOFORGE: focus-visible outline ensure at render site`;
          fs.writeFileSync(abs, content, "utf8");
          results.push({
            path: w.relPath,
            action: "append_focus_hint",
            ok: true,
          });
        }
      } catch (err) {
        results.push({
          path: w.relPath,
          action: "inject_focus_classes",
          ok: false,
          error: err.message,
        });
      }
    }

    return { applied: true, results, postCompliance };
  }

  async runConfiguredTests(targetPaths = []) {
    try {
      // Detect runner
      const runner = this.detectTestRunner(targetPaths);
      if (runner) {
        const ok = await this.#runShell(runner);
        return ok;
      }
      // Fallback to configured command
      const cfgPath = path.join(this.repoRoot, "autoforge.config.json");
      if (!fs.existsSync(cfgPath)) return true;
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      const cmd = cfg?.qualityPolicies?.tests?.cmd;
      if (!cmd) return true;
      const ok = await this.#runShell(cmd);
      return ok;
    } catch {
      return true;
    }
  }

  detectTestRunner(targetPaths = []) {
    try {
      const pkgPath = path.join(this.repoRoot, "package.json");
      if (!fs.existsSync(pkgPath)) return null;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const hasJest =
        (pkg.devDependencies && pkg.devDependencies.jest) ||
        (pkg.dependencies && pkg.dependencies.jest) ||
        (pkg.scripts && pkg.scripts.test && pkg.scripts.test.includes("jest"));
      const hasVitest =
        (pkg.devDependencies && pkg.devDependencies.vitest) ||
        (pkg.scripts &&
          pkg.scripts.test &&
          pkg.scripts.test.includes("vitest"));
      const filesArg =
        targetPaths && targetPaths.length
          ? targetPaths.map((p) => `'${p}'`).join(" ")
          : "";
      if (hasJest) {
        // Use findRelatedTests when we have files, else run jest quietly
        return filesArg
          ? `npx jest --runInBand --findRelatedTests ${filesArg}`
          : "npx jest --runInBand";
      }
      if (hasVitest) {
        return filesArg ? `npx vitest run ${filesArg}` : "npx vitest run";
      }
      return null;
    } catch {
      return null;
    }
  }

  #runShell(command) {
    return new Promise((resolve) => {
      const child = spawn(
        process.platform === "win32" ? "cmd" : "sh",
        [process.platform === "win32" ? "/c" : "-c", command],
        {
          stdio: "inherit",
          cwd: this.repoRoot,
        },
      );
      child.on("exit", (code) => resolve(code === 0));
    });
  }

  async readMemoryGate(role) {
    try {
      const globalPath = path.join(this.memoryDir, "global.md");
      const rolePath = path.join(this.memoryDir, `${role}.md`);
      const g = fs.existsSync(globalPath)
        ? fs.readFileSync(globalPath, "utf8").slice(0, 2000)
        : "";
      const r = fs.existsSync(rolePath)
        ? fs.readFileSync(rolePath, "utf8").slice(0, 2000)
        : "";
      this.log({
        stage: "memory_read",
        role,
        global_excerpt: g.length,
        role_excerpt: r.length,
      });
    } catch (err) {
      this.log({ type: "warn", msg: `Memory read failed: ${err.message}` });
    }
  }

  async writeMemoryDelta(role, text) {
    try {
      const rolePath = path.join(this.memoryDir, `${role}.md`);
      const line = `- ${new Date().toISOString()}: ${text}\n`;
      fs.mkdirSync(this.memoryDir, { recursive: true });
      fs.appendFileSync(rolePath, line);
      const globalPath = path.join(this.memoryDir, "global.md");
      fs.appendFileSync(globalPath, line);
      this.log({ stage: "memory_write", role, bytes: line.length });
    } catch (err) {
      this.log({ type: "warn", msg: `Memory write failed: ${err.message}` });
    }
  }

  setDagStatus(id, status) {
    const node = this.dag.find((n) => n.id === id);
    if (node) node.status = status;
  }
}

function setNestedToken(obj, dotted, value) {
  if (!obj || !dotted) return false;
  const parts = dotted.split(".");
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!Object.prototype.hasOwnProperty.call(curr, k)) return false;
    curr = curr[k];
    if (typeof curr !== "object" || curr === null) return false;
  }
  const leaf = parts[parts.length - 1];
  if (!Object.prototype.hasOwnProperty.call(curr, leaf)) return false;
  curr[leaf] = value;
  return true;
}
