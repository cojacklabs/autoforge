# AutoForge — Compliance, Documentation & Process Hardening Blueprint

> Generated: 2026-08-16 | For: AutoForge v0.4.1 (@cojacklabs/autoforge) | License: MIT © CoJack Labs

This document translates 2026 SDLC best practices into machine-enforceable policies, quality gates, and evidence requirements for AutoForge's agentic AI workflows. It is designed to make AutoForge projects audit-ready (SOC 2 / ISO 27001) while preserving developer velocity. [web:19][web:20][web:25][web:26]

---

## 1) What "efficient + compliant" looks like in 2026

Efficient software teams combine disciplined process with fast feedback. The biggest performance gaps come from three things: CI/CD pipelines that give rapid, reliable feedback; a test automation pyramid that keeps builds fast; and clean-code standards that keep complexity low enough for safe change. [web:25] At the same time, auditors and enterprise buyers increasingly demand process evidence (not just outcomes) across the SDLC—requirements traceability, change approvals, test results, deployment logs, and incident records. [web:19][web:20]

**AutoForge goal:** Be both a delivery accelerator and an evidence generator—every agent action produces auditable artifacts, and every phase has enforceable gates.

---

## 2) Map AutoForge to the 7 SDLC phases (with required artifacts)

Use the canonical SDLC phases as the backbone for your autopilot engine. For each phase, define inputs, outputs, and mandatory artifacts that AutoForge will require before allowing progression. [web:16][web:26]

| SDLC phase                  | AutoForge enforcement                                                       | Required artifacts (evidence)                                               |
| --------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1) Planning & feasibility   | Require a brief → structured spec; block coding until spec exists.          | Scope, success metrics, risk register, constraints.                         |
| 2) Requirements analysis    | Enforce functional + non-functional requirements; link to acceptance tests. | Requirements spec, traceability matrix, acceptance criteria.                |
| 3) Design & architecture    | Require design review for cross-cutting concerns (security, data, APIs).    | Architecture diagrams, data flow, threat model, API contracts (OpenAPI).    |
| 4) Development              | Enforce coding standards, PR templates, and pre-commit hooks.               | Commits (Conventional Commits), PRs with reviews, SAST/secret scan results. |
| 5) Testing                  | Enforce test pyramid and coverage floors; block merge on failures.          | Unit/integration/E2E results, coverage report, regression report.           |
| 6) Deployment & release     | Require approvals, change tickets, and rollback plans.                      | Deployment records, change approvals, release notes, SBOM.                  |
| 7) Maintenance & monitoring | Continuous monitoring, defect tracking, and periodic access reviews.        | Incident tickets, post-mortems, patch logs, quarterly access reviews.       |

This mirrors SOC 2 Secure SDLC expectations and SDLC audit checklists, making AutoForge projects audit-ready by construction. [web:20][web:19]

---

## 3) Governance & policy layer (make compliance automatic)

Turn policies into machine-enforceable gates. AutoForge's `.autoforge/` directory should include policy manifests that the CLI and runtime evaluate before allowing state transitions.

- **Software Development Policy:** defines SDLC phases, roles, and evidence expectations. [web:20]
- **Change Management Policy:** requires two-stage approval for production changes; emergency change path with post-approval. [web:20]
- **Access Control Policy:** least-privilege, MFA, quarterly access reviews; environment separation (dev/stage/prod). [web:20]
- **Secure Coding Standards:** OWASP Top 10–aligned rules; input validation, authZ checks, error handling. [web:25][web:26]
- **Incident Response Plan:** logging, classification, escalation, post-mortem template. [web:20]

AutoForge should validate that these policies exist and are referenced in runbooks and PR templates. For regulated contexts, add a Secure Development Policy and threat modeling requirement. [web:29]

---

## 4) CI/CD quality gates (the "hard" gates agents must pass)

Adopt a shift-left security model with explicit pipeline gates that block merges/deployments. [web:25][web:26]

| Gate                | Purpose                                | Typical tools                           | Block condition                            |
| ------------------- | -------------------------------------- | --------------------------------------- | ------------------------------------------ |
| Pre-commit          | Catch secrets, formatting, basic lint. | gitleaks, prettier, eslint              | Secret found; lint/format fail             |
| SAST                | Static security and quality issues.    | Semgrep, ESLint security plugins        | Critical/high findings                     |
| Dependency scan     | Known CVEs in packages.                | Dependabot, OWASP DC                    | CVSS ≥ 7.0 (configurable)                  |
| Test suite          | Functional correctness + regression.   | Jest/Vitest, Playwright                 | Any failing test                           |
| Coverage floor      | Guard against untested changes.        | c8/nyc                                  | Coverage delta negative or below threshold |
| Code review         | Human judgment on design/logic.        | GitHub PR reviews                       | Missing required approvers                 |
| Deployment approval | Change control for prod.               | GitHub Environments, Jira change ticket | No approved change record                  |

Quality gates should be gradual: start with tests + coverage, then raise thresholds each sprint. Share failure data openly and align gates with team goals. [web:18]

---

## 5) Documentation standards that survive turnover

Make documentation part of the pipeline, not an afterthought. AutoForge should require and auto-generate specific docs per phase.

- **OpenAPI-first:** API contracts in machine-readable OpenAPI 3.1, validated in CI. [web:25]
- **README template:** purpose, setup (≤5 commands), env vars, link to OpenAPI. [web:25]
- **Design docs:** architecture diagrams (Mermaid), data flows, threat models stored in `docs/`. [web:20][web:29]
- **Change logs:** auto-generated from Conventional Commits; release notes tied to tags. [web:25]
- **Evidence repository:** centralized, timestamped artifacts (risk register, test reports, deployment logs) mapped to controls. [web:20]

Remote and async teams need extra documentation and regular sync points; AutoForge can enforce doc updates as part of PR completion. [web:16]

---

## 6) Change management & audit trail (for SOC 2 / ISO 27001 readiness)

Auditors look for authorized, tested, and documented changes with separation of duties. [web:20] AutoForge should:

- Require PRs with peer review (no self-approval on sensitive paths).
- Link each PR to a change ticket or user story; enforce traceability to requirements.
- Record who approved, what tests passed, and the deployment target.
- Maintain a vulnerability register and remediation evidence. [web:20]
- Produce an SDLC audit checklist output (controls examined, status, evidence links). [web:19]

This turns every session into defensible evidence for SOC 2, ISO 27001, or customer security reviews. [web:20][web:29]

---

## 7) AI-specific guardrails (because agents write code too)

AI-assisted development introduces process risks most checklists haven't caught up with. Treat AI output as untrusted until validated. [web:19]

- **Output scoping:** agents operate within defined modules; cross-boundary changes require human-initiated commits. [web:25]
- **Human-in-loop merge gates:** no auto-merge on security-sensitive files (auth, data access, input validation). [web:25]
- **Feature-flag wrapping:** ship agent changes behind short-lived flags; log expiry dates to avoid flag rot. [web:25]
- **SAST/secret scans apply equally to agent-authored code;** pipeline doesn't distinguish author. [web:25]
- **Log agent actions separately** for audit trails (who/what/when/why). [web:19]

---

## 8) Observability & metrics (prove efficiency, not just compliance)

Track DORA metrics and quality signals to ensure speed doesn't sacrifice safety. [web:25][web:16]

- Deployment frequency, change failure rate, mean time to recovery (MTTR).
- Defect rates, test coverage trends, cyclomatic complexity ceilings (e.g., ≤10/function). [web:25]
- Token/cost budgets per workflow; circuit breakers on loops or stalls. [web:9]

AutoForge should emit these metrics to dashboards and include them in release reports.

---

## 9) Recommended updates to your AutoForge structure

To operationalize the above, consider adding these to your repo and runtime:

- `policies/` (or keep in `ai/policies/`): machine-readable policy manifests (SDLC, change mgmt, access control, incident response). [web:20]
- `evidence/`: timestamped artifacts auto-collected per phase (risk register, test reports, deployment logs, access reviews). [web:20]
- `docs/THREAT_MODEL.md` and `docs/ARCHITECTURE.md`: required for cross-cutting features. [web:20][web:29]
- `docs/OPENAPI.yaml`: OpenAPI-first contract; CI validates against it. [web:25]
- `qa/defect_register.yaml` and `qa/vulnerability_register.yaml`: track findings, severity, remediation, closure. [web:20]
- `devops/quality_gates.yaml`: thresholds for coverage, complexity, SAST severity, dependency CVSS. [web:18][web:25]
- `change_requests/` (you have this): enforce linkage to PRs and deployments; include rollback plans. [web:20]
- `security/SBOM.*`: software bill of materials for releases. [web:26]

---

## 10) A strict, agent-enforced workflow (reference)

- **Spec gate:** No code generation until requirements + acceptance tests exist. [web:16][web:17]
- **Design gate:** For cross-cutting changes, require architecture + threat model review. [web:20][web:29]
- **Build gate:** Pre-commit hooks (format, lint, secret scan); SAST on PR. [web:25]
- **Test gate:** Enforce test pyramid and coverage floors; block merge on failures. [web:25][web:18]
- **Change gate:** Require approved change record + rollback plan for prod deploys. [web:20]
- **Post-deploy:** Monitor logs/metrics; open incident tickets on anomalies; run post-mortems. [web:20]

This mirrors SOC 2 Secure SDLC steps and SDLC audit expectations, making AutoForge projects compliant by default. [web:20][web:19]

---

## 11) Next-step artifacts (ready for your agentic AI developer)

Tell us which artifact you want first, and whether you're optimizing for SOC 2 Type II readiness, ISO 27001 alignment, or general enterprise procurement readiness—we'll tailor the templates accordingly. [web:20][web:29]

- **Policy manifest template** (SDLC, change mgmt, access control, incident response) for `.autoforge/`. [web:20]
- **Quality gates config** (`quality_gates.yaml`) with sensible defaults (coverage, complexity, SAST, dependency CVSS) and escalation rules. [web:18][web:25]
- **Evidence collection checklist** mapped to SDLC phases and SOC 2 controls (what to capture, where to store, how to link to PRs/deploys). [web:20]
- **PR template + change request schema** that enforces traceability to requirements and includes rollback plans. [web:20][web:25]

---

## 12) Sources

- SDLC audit guidance and business leader's checklist (2026) [web:19]
- SOC 2 Secure SDLC requirements and templates (2026) [web:20]
- 11 Software Development Best Practices in 2026 (CI/CD, test automation, secure coding, AI-assisted review) [web:25]
- SDLC Explained: Complete Guide for 2026 (phases, models, DevOps) [web:26]
- Software Quality Gates: Benefits, Use Cases & Best Practices (2026) [web:18]
- Software Development Process: 7 Phases Explained (2025/2026) [web:16]
- ISO 27001 Secure SDLC: Key Requirements, Steps, and Templates (2026) [web:29]

> Note: Citations are inline per sentence where claims depend on external sources.
