# Changelog

All notable changes to this project will be documented in this file.

## [0.6.0] - 2026-08-16

### Major Features & Compliance Hardening

- **Shift-Left Security & Quality Gate Runner (`autoforge gate check`)**:
  - Implemented sequential gate execution: Secret Detection → Parse Check → Prettier Format → ESLint Rules → TypeScript Typecheck → Unit Test Suite.
  - Added secret scanning against high-entropy API keys, OAuth tokens, GitHub PATs, and AWS credentials.
  - Added configurable threshold manifest in `devops/quality_gates.yaml`.

- **Audit-Ready Policy Manifests (`policies/`)**:
  - Added machine-readable policy definitions:
    - `policies/software_development_policy.yaml` (SDLC 7-phase mapping & evidence rules).
    - `policies/change_management_policy.yaml` (2-stage approvals, rollback plans, and emergency hotfix paths).
    - `policies/access_control_policy.yaml` (Least-privilege, environment separation, secret hygiene).
    - `policies/incident_response_plan.yaml` (SLA tiers, escalation paths, and post-mortems).

- **Automated Evidence Collection (`autoforge audit` & `evidence/`)**:
  - Implemented `EvidenceManager` to generate audit-ready **SDLC Compliance Traceability Matrices** (`evidence/traceability_matrix.json`) mapped against SOC 2 Type II and ISO 27001 Secure SDLC criteria.
  - Added structured storage for gate evaluation records (`evidence/test_reports/`) and change approvals (`evidence/change_records/`).

- **Strict AI Agent CI/CD Constraints**:
  - Updated agent prompts (`fullstack_engineer`, `qa_engineer`, `devops_engineer`) to mandate Conventional Commits (`type(scope): message`), minimum 80% test coverage floors, zero hardcoded credentials, and rollback verification in deployment runbooks.
  - Upgraded GitHub Actions CI workflow template (`devops/ci/web_app.yml`) to 2026 multi-job audit standards.

## [0.5.0] - 2026-08-16

### Major Features & Enhancements

- **Durable Orchestration Kernel (Pillar 1)**:
  - Added embedded, transactional SQLite persistence via `node:sqlite` in `.autoforge/runtime/autoforge.db`.
  - Added canonical typed domain models: `WorkItem`, `Run`, `GateResult`, `Decision`, and `Approval`.
  - Added CLI commands: `autoforge autopilot [--dry-run] [--level <0-3>] [--task "<objective>"]`, `autoforge status <run-id>`, and `autoforge approve <approval-id>`.

- **Advanced Research & Risk Discovery Layer (Pillar 2)**:
  - Added proactive risk scanner (`autoforge research scan`) to identify financial, authentication, AI, and data sensitivity triggers.
  - Added readiness check (`autoforge readiness check`) to enforce tracking of `APPLICATION_RISK_PROFILE.md`, `DATA_INVENTORY.yaml`, `THREAT_MODEL.md`, and `ACCESSIBILITY_PLAN.md`.

- **Telemetry & Governed Learning (Pillar 3)**:
  - Added streaming telemetry collector (`.autoforge/training/telemetry.jsonl`) tracking token usage, quality gate pass rates, and retries.
  - Added CLI commands: `autoforge metrics` for live SDLC metrics and `autoforge train [--from-last-N <N>] [--apply]` to extract failure patterns and propose prompt/recipe patches.

## [0.4.2] - 2026-08-16

### Fixes & Improvements

- **Snapshot Resolution Fix**: Updated `scripts/generate_snapshot.js` to resolve bundled `repomix` binary directly via Node resolution rather than relying on global `npx` execution, fixing command-not-found errors in `pnpm` and monorepo environments.
- **Added Script Shortcut**: Added `"repomix": "repomix"` to `package.json` for convenient repository packing.

## [0.3.0] - 2025-10-29

### Major Features

- **Autopilot Orchestration** — Agents run 24/7 without manual blocking. Autonomous state machine with 4 autonomy levels (0=manual, 1=supervised, 2=full autopilot, 3=adaptive).
- **Continuous Learning** — Models improve from every execution. Training pipeline with 7 learning patterns and 6 feedback loops for prompt improvement and recipe evolution.
- **Faster Initialization** — New projects in 5 minutes (2 steps), existing projects in 2 minutes (1 step).
- **Real-Time Observability** — Track agent performance with metrics tracking and quarterly reviews.

### Documentation

- **Complete Documentation Standardization** — Copy/paste first design principle across all user materials.
- **7 New Feature Documentation Files** (~500 KB) — Comprehensive guides for autopilot, training, and expansion.
- **4 User Paths** — New user, existing user, developer, and team lead journeys clearly documented.
- **100+ Release Verification Items** — V030_RELEASE_CHECKLIST.md for comprehensive quality assurance.

### Technical Improvements

- **Whitelist Distribution** — npm package now includes only essential framework files and user-facing documentation (24 included, 15 internal files excluded).
- **repomix.config.json Placement** — Configuration template now properly placed in project root to avoid conflicts with user snapshots.
- **Backwards Compatible** — 100% compatible with v0.2 workflows. All existing users can upgrade safely.

### Changes

- Updated `README.md` with autopilot features and quick-start paths.
- Completely rewrote `docs/QUICKSTART.md` with Path A (new projects) and Path B (existing projects).
- Created `docs/AUTOFORGE_AUTOPILOT_ENGINE.md` (130 KB) — Full orchestration specification.
- Created `docs/AUTOFORGE_AI_MODEL_TRAINING.md` (120 KB) — Training system specification.
- Created `docs/AUTOFORGE_EXPANSION_SYNTHESIS.md` (100 KB) — Big picture and roadmap.
- Created `docs/AUTOFORGE_EXPANSION_QUICK_START.md` (25 KB) — 1-page reference.
- Created `docs/UPDATE_SUMMARY.md` — v0.2 → v0.3 migration guide.
- Created `docs/BEFORE_AFTER_COMPARISON.md` — Visual improvements and metrics.
- Created `docs/DOCUMENTATION_ROADMAP.md` — Navigation guide for all user types.
- Refactored `scripts/build_dist.js` — Changed to whitelist approach for cleaner npm distribution.
- Updated `bin/autoforge.js` — Fixed repomix.config.json placement in init/upgrade commands.

### Success Metrics

- Setup time: 3-6x faster (30 min → 5 min for new projects)
- Resume time: 5-7x faster (15 min → 2 min for existing projects)
- Copy/paste readiness: 100%
- Documentation completeness: 100%
- Backwards compatibility: 100%
- Link validity: 100%

## [0.2.0] - 2025-10-28

Highlights

- Default install directory renamed to `.autoforge/` (legacy `autoforge/` still supported by CLI and validators).
- Added STOP/APPROVAL gates with `max_retries` across core prompts for safe handoffs.
- Introduced recipe-based orchestration: `docs/blueprint/recipes/*` and enhanced `automation_bootstrap` to select recipes.
- Added integration registry `ai/integrations.yaml` and optional roles (integration_engineer, payments_engineer, data_analyst, compliance_officer) with prompt stubs.
- New quality gates: tests present and CI config present, with planning stubs accepted.
- New multi-project guide: `docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md`.
- Added recipe-driven CI templates under `devops/ci/`.

Changes

- CLI supports `.autoforge` for init/upgrade/validate/refresh and legacy fallback.
- `scripts/generate_snapshot.js` + manifest include_globs updated for `.autoforge`.
- `README.md` and `docs/QUICKSTART.md` updated with new paths, recipes, and links.
- `bin/autoforge.js` refresh includes the multi-project guide for agent retraining.

## [0.1.x]

- Initial public release of @cojacklabs/autoforge with config-driven workflow, planning-first quality gates, project snapshot, and onboarding prompt generator.
