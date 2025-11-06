// PM adapter: normalize user prompt into UserAsk and triage into IssueReport.
// Stubs return minimal, schema-compliant artifacts for downstream roles.

export function buildUserAsk(rawText) {
  const text = String(rawText || "").trim();
  const intent = inferIntent(text);
  const targetSurfaces = inferTargets(text);
  const acceptance = inferAcceptance(text, targetSurfaces);
  const assumptions = inferAssumptions(text);

  return {
    id: `userask_${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: "cli",
    raw_text: text,
    intent,
    severity: "major",
    confidence: 0.7,
    clarifying_questions: [],
    assumptions: assumptions.map((a) => ({ assumption: a, confidence: 0.6 })),
    constraints: {},
    target_surfaces: targetSurfaces,
    acceptance_criteria: acceptance,
    references: [],
  };
}

export function triageIssue(userAsk) {
  const category = userAsk.intent === "ux" ? "ux" : userAsk.intent;
  return {
    id: `issue_${Date.now()}`,
    user_ask_id: userAsk.id,
    category,
    priority: userAsk.severity === "critical" ? "P0" : "P1",
    status: "triaged",
    components: userAsk.target_surfaces || [],
    affected_versions: [],
    environment: {},
    repro_steps: [],
    observed_behavior: "",
    expected_behavior: (userAsk.acceptance_criteria || []).join("; "),
    related_artifacts: [userAsk.id],
    notes: "",
  };
}

function inferIntent(text) {
  const t = text.toLowerCase();
  if (/(ux|ui|design|button|layout|style|accessibil)/.test(t)) return "ux";
  if (/(perf|slow|latency|memory|cpu)/.test(t)) return "performance";
  if (/(security|xss|csrf|injection|leak)/.test(t)) return "security";
  if (/(bug|error|fail|broken|doesn\'t|cannot)/.test(t)) return "bug";
  if (/(add|feature|new)/.test(t)) return "feature";
  return "other";
}

function inferTargets(text) {
  const targets = [];
  if (/button/i.test(text)) targets.push("Button");
  if (/nav|menu/i.test(text)) targets.push("Navigation");
  if (/form|input|field/i.test(text)) targets.push("Form");
  return targets;
}

function inferAcceptance(text, targets) {
  const arr = [];
  if (targets.includes("Button")) {
    arr.push("Buttons match reference style");
    arr.push("Focus/hover states pass WCAG AA");
  }
  arr.push("No TypeScript errors");
  arr.push("ESLint warnings = 0");
  return arr;
}

function inferAssumptions(text) {
  const a = [];
  if (/inspiration|dribbble|behance|example/i.test(text)) {
    a.push("UI inspiration will be provided or approved");
  }
  return a;
}

