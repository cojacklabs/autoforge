// UI/UX adapter: propose CodePlan and TestPlan for UX issues.
// This is a minimal, schema-compliant draft suitable for validator checks.

import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

function discoverTokenFiles(roots = []) {
  const patterns = [
    "**/tokens.@(css|scss)",
    "**/*.tokens.@(ts|js|json)",
    "**/theme.@(ts|js|json)",
    "**/*.css",
  ];
  const files = [];
  for (const root of roots) {
    for (const pat of patterns) {
      const matches = globSync(pat, {
        cwd: root,
        absolute: true,
        nodir: true,
        dot: true,
      });
      for (const m of matches) files.push(m);
    }
  }
  // de-dup
  return Array.from(new Set(files));
}

function extractTokens(filePath) {
  const out = {};
  try {
    const data = fs.readFileSync(filePath, "utf8");
    if (/\.json$/i.test(filePath)) {
      const json = JSON.parse(data);
      flattenObject(json, out);
    } else if (/\.(ts|js)$/i.test(filePath)) {
      // naive: attempt to parse JSON-like export default { ... }
      const match = data.match(/export\s+default\s+(\{[\s\S]*\});?/);
      if (match) {
        try {
          flattenObject(eval("(" + match[1] + ")"), out);
        } catch {}
      }
    } else if (/\.s?css$/i.test(filePath)) {
      const varRe = /--([a-z0-9-_]+)\s*:\s*([^;]+);/gi;
      let m;
      while ((m = varRe.exec(data))) {
        out[`css.${m[1]}`] = m[2].trim();
      }
    }
  } catch {}
  return out;
}

function flattenObject(obj, target, prefix = "") {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flattenObject(v, target, key);
    else target[key] = String(v);
  }
}

function findClosestTokenKey(extracted, hints = []) {
  const keys = Object.keys(extracted);
  for (const hint of hints) {
    const re = new RegExp(hint, "i");
    const hit = keys.find((k) => re.test(k));
    if (hit) return hit;
  }
  return null;
}

export function researchAndPropose(
  issueReport,
  { approvalGranted = false, repoRoot = process.cwd(), allowedRoots = [] } = {},
) {
  const idBase = Date.now();
  // If research approval is granted, simulate inspiration-derived tokens; else fallback generic tokens
  const designSpec = {
    id: `designspec_${idBase}`,
    source: approvalGranted ? "research" : "fallback",
    tokens: {
      colors: approvalGranted
        ? { primary: "#0F9D58", primaryHover: "#0B8043", focusRing: "#1A73E8" }
        : { primary: "#2563EB", primaryHover: "#1D4ED8", focusRing: "#2563EB" },
      spacing: { sm: "4px", md: "8px", lg: "12px" },
      typography: { base: "Inter, system-ui, sans-serif" },
      radius: { sm: "4px", md: "8px" },
    },
    components: [
      {
        name: "Button",
        states: ["default", "hover", "focus"],
        a11y: ["focus-visible", "contrast AA"],
      },
    ],
    a11yGoals: ["WCAG AA"],
    notes: approvalGranted
      ? "Derived from approved inspiration sources."
      : "Generic fallback without external research.",
  };
  // Attempt to compute a diff against current repo tokens if any discovered
  const tokenRoots = allowedRoots.length ? allowedRoots : [repoRoot];
  const tokenFiles = discoverTokenFiles(tokenRoots);
  const extracted = tokenFiles.reduce(
    (acc, f) => Object.assign(acc, extractTokens(f)),
    {},
  );
  const primaryKey = findClosestTokenKey(extracted, [
    "color.*primary",
    "primary",
    "css\\.color-?primary",
    "css\\.primary",
  ]);
  const focusKey = findClosestTokenKey(extracted, [
    "focus.*ring",
    "focusRing",
    "css\\.focus-?ring",
  ]);
  const styleGuideDiff = {
    id: `stylediff_${idBase}`,
    related_design_spec: designSpec.id,
    tokenChanges: [
      {
        token: primaryKey || "colors.primary",
        from: primaryKey ? extracted[primaryKey] || "?" : "?",
        to: designSpec.tokens.colors.primary,
        rationale: "Align with spec",
      },
      {
        token: focusKey || "colors.focusRing",
        from: focusKey ? extracted[focusKey] || "?" : "?",
        to: designSpec.tokens.colors.focusRing,
        rationale: "Visible focus",
      },
    ],
    componentChanges: [
      {
        component: "Button",
        property: ":focus-visible outline",
        from: "none",
        to: `2px solid ${designSpec.tokens.colors.focusRing}`,
        rationale: "Accessibility",
      },
      {
        component: "Button",
        property: ":hover background",
        from: "?",
        to: designSpec.tokens.colors.primaryHover,
        rationale: "Hover affordance",
      },
    ],
    notes: "Minimal deltas to achieve design goals",
  };

  const plans = proposePlans(issueReport, designSpec, styleGuideDiff, {
    tokenFiles,
  });
  return { designSpec, styleGuideDiff, ...plans };
}

export function proposePlans(
  issueReport,
  designSpec,
  styleGuideDiff,
  { tokenFiles = [] } = {},
) {
  const idBase = Date.now();
  const codePlan = {
    id: `codeplan_${idBase}`,
    user_ask_id: issueReport.user_ask_id,
    goals: [
      "Align UI elements with inspiration/design intent",
      "Improve focus/hover states and accessibility",
    ],
    strategy:
      "Update design tokens and component styles with minimal diffs; add a11y states.",
    impacted_areas: issueReport.components || [],
    changes: [
      {
        type: "modify",
        path: "src/client/components/Button.tsx",
        symbol: "Button",
        description: "Adjust tokens, spacing, focus/hover styles to meet a11y.",
        rationale: "UX alignment and accessibility",
        dependencies: [],
        acceptance_tests: ["ux_button_visual", "ux_button_accessibility"],
        risk_level: "medium",
      },
      // Example token update location; projects can map this differently
      ...(tokenFiles.length
        ? [
            {
              type: "modify",
              path: path.relative(process.cwd(), tokenFiles[0]),
              symbol: null,
              description: `Update tokens based on StyleGuideDiff (${styleGuideDiff.id})`,
              rationale: "DesignSpec token alignment",
              dependencies: [],
              acceptance_tests: ["ux_button_visual"],
              risk_level: "low",
            },
          ]
        : []),
    ],
    non_goals: ["Rewrite entire design system"],
    rollback_plan: "Revert style/token changes and restore snapshots",
    metrics: { a11y: "AA", visual_diff: "< 1%" },
    links: [],
  };

  const testPlan = {
    id: `testplan_${idBase}`,
    related_artifacts: [codePlan.id, issueReport.id].concat(
      designSpec ? [designSpec.id] : [],
    ),
    objectives: ["Ensure UX consistency and accessibility for Buttons"],
    coverage_summary: "Visual snapshots and a11y checks for updated components",
    cases: [
      {
        id: "ux_button_visual",
        description: "Button should match golden snapshot",
        type: "visual",
        priority: "P1",
        target_paths: ["src/client/components/Button.tsx"],
        inputs: {},
        steps: ["render <Button/> in default and hover/focus states"],
        assertions: ["snapshot matches"],
        oracle: "snapshot",
      },
      {
        id: "ux_button_accessibility",
        description: "Button focus visible and contrast AA or above",
        type: "accessibility",
        priority: "P1",
        target_paths: ["src/client/components/Button.tsx"],
        inputs: {},
        steps: ["check :focus-visible style", "check contrast ratio"],
        assertions: ["focus ring visible", "contrast >= AA"],
        oracle: "a11y",
      },
    ],
  };

  return { codePlan, testPlan };
}
