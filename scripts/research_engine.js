import path from "node:path";
import fs from "node:fs";
import { globSync } from "glob";

/**
 * Advanced Research & Risk Discovery Engine (v1)
 *
 * Proactively inspects project goals, code repositories, dependencies,
 * and API contracts to identify domain risk tiers, privacy flows,
 * threat models, and required compliance/accessibility controls.
 */
export class ResearchEngine {
  /**
   * @param {Object} [options]
   * @param {string} [options.projectRoot]
   */
  constructor({ projectRoot = process.cwd() } = {}) {
    this.projectRoot = projectRoot;
  }

  /**
   * Scan repository & goal to produce an Application Risk Profile
   * @param {string} [goal]
   */
  async scan(goal = "") {
    const findings = [];
    const assumptions = [];
    const missingArtifacts = [];
    let riskTier = "R1"; // Default standard tier

    // 1. Dependency Analysis
    const pkgPath = path.join(this.projectRoot, "package.json");
    let dependencies = [];
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        dependencies = Object.keys(pkg.dependencies || {}).concat(
          Object.keys(pkg.devDependencies || {}),
        );
      } catch {}
    }

    // Risk Trigger: Financial / Payment integration
    const paymentKeywords = ["stripe", "paypal", "braintree", "paddle", "billing", "payment", "checkout", "subscription"];
    const hasPaymentDep = dependencies.some((d) => paymentKeywords.some((k) => d.includes(k)));
    const hasPaymentGoal = paymentKeywords.some((k) => goal.toLowerCase().includes(k));

    if (hasPaymentDep || hasPaymentGoal) {
      riskTier = "R2";
      findings.push({
        domain: "financial_integrity",
        riskTier: "R2",
        message: "Payment or financial transactions detected in dependencies or task objective.",
        controlsRequired: ["PCI-DSS scope minimization", "Webhook signature verification", "Idempotency keys"],
        reviewer: "Security / Compliance Lead",
      });
    }

    // Risk Trigger: Auth / Identity / Sensitive Personal Data
    const authKeywords = ["auth", "passport", "jwt", "oauth", "session", "bcrypt", "cookie", "login", "signup", "user"];
    const hasAuthDep = dependencies.some((d) => authKeywords.some((k) => d.includes(k)));
    const hasAuthGoal = authKeywords.some((k) => goal.toLowerCase().includes(k));

    if (hasAuthDep || hasAuthGoal) {
      if (riskTier === "R1") riskTier = "R1"; // Keep elevated
      findings.push({
        domain: "privacy_and_identity",
        riskTier: "R1",
        message: "Authentication, identity, or user account handling detected.",
        controlsRequired: ["OWASP ASVS Password Policies", "Rate Limiting on Auth Endpoints", "Data Minimization & Deletion Policy"],
        reviewer: "Engineering Lead / Privacy Reviewer",
      });
    }

    // Risk Trigger: AI / Model integrations
    const aiKeywords = ["openai", "anthropic", "gemini", "langchain", "ollama", "mistral", "cohere", "llama", "gpt", "rag", "agent", "llm"];
    const hasAiDep = dependencies.some((d) => aiKeywords.some((k) => d.includes(k)));
    const hasAiGoal =
      aiKeywords.some((k) => goal.toLowerCase().includes(k)) ||
      /\b(ai|llm|ml|gpt)\b/i.test(goal);

    if (hasAiDep || hasAiGoal) {
      riskTier = "R2";
      findings.push({
        domain: "ai_risk_management",
        riskTier: "R2",
        message: "Generative AI or machine learning models in use.",
        controlsRequired: ["NIST AI RMF Human-in-the-Loop Oversight", "Prompt Injection Defenses", "PII Redaction before External Model Calls"],
        reviewer: "AI Safety / Architecture Lead",
      });
    }

    // 2. Data Surface & Privacy Checks
    const dataInventory = {
      detectedCategories: [],
      dataDestinations: [],
    };

    if (hasAuthDep || hasAuthGoal) {
      dataInventory.detectedCategories.push({
        field: "User Credentials / Tokens",
        classification: "Confidential / Auth",
        retentionPolicy: "Encrypted at rest (bcrypt/argon2), zero-plain-text logs",
      });
    }

    if (hasPaymentDep || hasPaymentGoal) {
      dataInventory.detectedCategories.push({
        field: "Payment Metadata & Customer IDs",
        classification: "Sensitive Financial",
        retentionPolicy: "Delegated to PCI-compliant provider (e.g. Stripe Customer ID only)",
      });
    }

    // 3. Check for standard readiness artifacts
    const requiredDocs = [
      { name: "APPLICATION_RISK_PROFILE.md", path: "docs/security/APPLICATION_RISK_PROFILE.md" },
      { name: "DATA_INVENTORY.yaml", path: "docs/privacy/DATA_INVENTORY.yaml" },
      { name: "THREAT_MODEL.md", path: "docs/security/THREAT_MODEL.md" },
      { name: "ACCESSIBILITY_PLAN.md", path: "docs/uiux/ACCESSIBILITY_PLAN.md" },
    ];

    for (const doc of requiredDocs) {
      const full = path.join(this.projectRoot, doc.path);
      if (!fs.existsSync(full)) {
        missingArtifacts.push(doc.name);
      }
    }

    return {
      goal,
      riskTier,
      findings,
      assumptions: [
        "Application adheres to least-privilege for third-party API credentials.",
        "External model providers do not train on customer inputs unless explicitly authorized.",
      ],
      dataInventory,
      missingArtifacts,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scaffold readiness artifacts into the project
   * @param {Object} scanResult
   */
  scaffoldReadinessArtifacts(scanResult) {
    const docsDir = path.join(this.projectRoot, "docs");
    const securityDir = path.join(docsDir, "security");
    const privacyDir = path.join(docsDir, "privacy");
    const uiuxDir = path.join(docsDir, "uiux");

    fs.mkdirSync(securityDir, { recursive: true });
    fs.mkdirSync(privacyDir, { recursive: true });
    fs.mkdirSync(uiuxDir, { recursive: true });

    // 1. APPLICATION_RISK_PROFILE.md
    const riskProfileContent = `# 🛡️ Application Risk Profile

> **Generated:** ${scanResult.timestamp}
> **Risk Tier:** ${scanResult.riskTier}
> **Objective / Goal:** ${scanResult.goal || "Standard Application Baseline"}

---

## 📊 Summary of Findings

${scanResult.findings.length === 0 ? "_No elevated risk triggers detected._" : scanResult.findings.map((f, i) => `### ${i + 1}. [${f.domain.toUpperCase()}] Tier: ${f.riskTier}
- **Description:** ${f.message}
- **Assigned Reviewer:** ${f.reviewer}
- **Mandatory Controls:**
${f.controlsRequired.map((c) => `  - [ ] ${c}`).join("\n")}
`).join("\n")}

---

## 🔍 Assumptions Requiring Verification
${scanResult.assumptions.map((a) => `- [ ] ${a}`).join("\n")}
`;
    fs.writeFileSync(path.join(securityDir, "APPLICATION_RISK_PROFILE.md"), riskProfileContent, "utf8");

    // 2. DATA_INVENTORY.yaml
    const dataInventoryYaml = `# AutoForge Data Inventory & Classification Map
generatedAt: "${scanResult.timestamp}"
riskTier: "${scanResult.riskTier}"
categories:
${scanResult.dataInventory.detectedCategories.map((c) => `  - field: "${c.field}"
    classification: "${c.classification}"
    retention: "${c.retentionPolicy}"
`).join("") || "  []\n"}
`;
    fs.writeFileSync(path.join(privacyDir, "DATA_INVENTORY.yaml"), dataInventoryYaml, "utf8");

    // 3. THREAT_MODEL.md
    const threatModelContent = `# 🔒 Threat Model (OWASP ASVS Baseline)

> **Objective:** Identify threat vectors, trust boundaries, and mitigations prior to code construction.

---

## 1. Trust Boundaries
- Client Browser <--> API Gateway / Edge
- Application Server <--> Relational Database (SQLite/Postgres)
- Application Server <--> External Third-Party APIs (OAuth/Payment/AI)

## 2. Identified Abuse Cases
- **Credential Stuffing / Brute Force:** Mitigated via rate-limiting and account lockouts.
- **Unauthorized Data Access (BOLA/IDOR):** Mitigated via server-side session authorization on every entity lookup.
- **Secret Exfiltration:** Mitigated via environment variable separation and gitignore rules.

## 3. Required Verification Gates
- [ ] Dependency Audit (\`npm audit\`)
- [ ] OWASP Top 10 API Security Checklist
- [ ] Sanitization on all external user-supplied inputs
`;
    fs.writeFileSync(path.join(securityDir, "THREAT_MODEL.md"), threatModelContent, "utf8");

    // 4. ACCESSIBILITY_PLAN.md
    const a11yPlanContent = `# ♿ Accessibility & Inclusive Design Plan (WCAG 2.2 Level AA)

> **Standard:** W3C Web Content Accessibility Guidelines (WCAG) 2.2 AA

---

## 1. Core Evaluation Targets
- [ ] **Keyboard Navigation:** All interactive elements must be focusable and operable without a mouse.
- [ ] **Color Contrast:** Text and interactive elements meet minimum contrast ratio of 4.5:1 (normal text) and 3:1 (large text).
- [ ] **Screen Reader Labels:** Form fields have programmatic labels (\`<label for="...">\` or \`aria-label\`).
- [ ] **Focus Visible:** Distinct visual outline on active/focused elements.

## 2. Automated & Human Evaluation Gates
- Automated: Lighthouse Accessibility Score >= 95
- Human Review: Manual Tab-key walkthrough across key user journeys.
`;
    fs.writeFileSync(path.join(uiuxDir, "ACCESSIBILITY_PLAN.md"), a11yPlanContent, "utf8");
  }
}
