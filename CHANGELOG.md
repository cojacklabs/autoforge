# Changelog

All notable changes to this project will be documented in this file.

> **Note:** Entries between 0.7.0 and 0.21.0 were tracked in
> `docs/planning/<version>/` release-readiness and validation documents
> rather than in this file. See those directories and git tags
> (`v0.7.0`–`v0.21.0`) for that history.

<!-- autoforge:changelog:start -->

## [0.22.1] - 2026-08-23

### Added

- **Agent onboarding & CLI reference currency**: the canonical startup
  prompt in `README.md` and `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md` (kept
  in lockstep) now directs agents to `docs/AUTOFORGE_CLI_REFERENCE.md`
  for the complete current command surface, so an onboarding agent can
  govern, scaffold, categorize, prioritize, and reorganize project work
  using the full AutoForge CLI rather than guessing. The reference doc
  itself is brought current: it gained the `learning`
  hypothesis/experiment/evidence command family and
  `autoforge changelog compile`, both shipped in v0.22.0 but previously
  undocumented.
- Documentation prose across the project no longer hardcodes version
  numbers (starting with `README.md`'s title and the reference doc's
  closing line), so these lines never need updating on future releases.

<!-- autoforge:changelog:end -->

## [0.22.0] - 2026-08-23

### Added

- **Learning & Evidence Engine**: three new durable domains —
  `hypothesis`, `experiment`, and `evidence` — closing the canonical
  `hypothesis → experiment → evidence → decision → updated specification`
  chain from the north-star roadmap:
  - `autoforge learning hypothesis add|list|show|status` — records a
    testable belief with a free-text `--metric`/`--target`.
  - `autoforge learning experiment add|list|show|complete` — an
    experiment may test multiple hypotheses at once.
  - `autoforge learning evidence add|list|show` — nine evidence kinds
    (`analytics`, `beta-feedback`, `support-ticket`, `bug-report`,
    `usability-study`, `experiment-result`, `performance-metric`,
    `interview`, `ai-evaluation`), linkable to an experiment, a
    hypothesis, and/or a work item simultaneously — not mutually
    exclusive.
  - `autoforge decide --evidence <id>` closes the loop: recording a
    decision stamps `resultingDecision` back onto every referenced
    evidence record, making the chain mechanically traceable rather than
    just linkable by convention.
  - The digital twin (`autoforge twin generate`) now projects
    hypothesis/experiment/evidence as nodes, with `tests`, `produced-by`,
    `informs`, and `resulted-in` edges connecting them to the rest of the
    project graph.

### Notes

- Evidence recorded against a decision is not yet surfaced by
  `autoforge why` — the data is correctly linked, but the primary
  read-query command doesn't yet show it. Tracked as
  `issue.surface-evidence-in-why-search`.
- This milestone was self-exercised end-to-end against AutoForge's own
  project state before release: a real hypothesis about the
  documentation-gate feature's effectiveness, an experiment, evidence
  from this project's own v0.21.1/v0.21.2 release history, and a
  decision closing the loop, all traceable via `resultingDecision` and
  visible in the twin projection.

## [0.21.2] - 2026-08-23

### Added

- **Data and security work kinds**: `autoforge intent assess --kind data|security`
  are now first-class intent kinds, each with a dedicated `data-change`/
  `security-change` workflow definition (research → planning →
  implementation → validation stages).

### Fixed

- **Silent planning-artifact overwrite**: `intent assess --artifact <kind>
--persist` previously wrote to a fixed `.autoforge/planning/<kind>.json`
  path, silently clobbering any prior artifact of the same kind. Artifacts
  are now namespaced by source fingerprint
  (`.autoforge/planning/<kind>/<fingerprint>.json`); `planning list` now
  shows every stored version, and `isFresh()` correctness was improved to
  check the exact artifact rather than "the latest."
- **Undiscoverable project lifecycle block**: a freshly registered project
  had `lifecycle: undefined`, which `autoforge use` silently treated as
  blocked for every mutating command while `projects list`/`show` still
  displayed it as `active`. New registrations now default to
  `lifecycle: active`, and the blocked-command error names the exact fix
  (`autoforge projects update <path> --lifecycle active`).
- **Low-quality generated user stories**: the `user-stories` planning
  artifact no longer lowercases leading acronyms, no longer doubles
  trailing punctuation, and states the shared objective once instead of
  repeating it on every line.

### Notes

A backlog triage also confirmed six previously-filed issues were already
fixed in 0.21.x, discovered by a reporting session running a stale global
`pnpm` install (v0.20.3) rather than a live defect. See
`.autoforge/state/decisions.json` for the individual audit records.

## [0.21.1] - 2026-08-22

### Fixed

- **Store empty-state handling**: `constitution`, `domain`, and `planning`
  commands no longer crash with raw uncaught `ENOENT` stack traces when run
  before their underlying store has been initialized. `ConstitutionStore`,
  `DomainStore`, and `PlanningArtifactStore` now resolve `null` (matching
  the existing `TwinProjectionStore` convention) and the CLI reports a
  friendly `invalidState` message with the command needed to initialize.
  See `docs/planning/0.21/V0.21.1_ENOENT_HARDENING.md`.

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
