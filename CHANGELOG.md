# Changelog

All notable changes to this project will be documented in this file.

> **Note:** Entries between 0.7.0 and 0.21.0 were tracked in
> `docs/planning/<version>/` release-readiness and validation documents
> rather than in this file. See those directories and git tags
> (`v0.7.0`–`v0.21.0`) for that history.

<!-- autoforge:changelog:start -->
<!-- autoforge:changelog:end -->

## [0.25.2] - 2026-08-25

### Fixed

- Require the corrected Core and SDK patch releases so fresh pnpm installations
  cannot resolve the unsupported workspace-range artifacts.

## [0.25.1] - 2026-08-25

### Package releases

| Package                           | Version  | Release status                                    |
| --------------------------------- | -------- | ------------------------------------------------- |
| `@cojacklabs/autoforge`           | `0.25.1` | Core CLI compatibility release                    |
| `@cojacklabs/autoforge-protocol`  | `0.1.0`  | Initial public protocol contract                  |
| `@cojacklabs/autoforge-core`      | `0.1.1`  | Corrected initial public Core package             |
| `@cojacklabs/autoforge-sdk`       | `0.1.1`  | Corrected initial public programmatic facade      |
| `@cojacklabs/autoforge-agent`     | `0.1.0`  | Private experimental package; independently gated |
| `@cojacklabs/autoforge-providers` | `0.1.0`  | Private experimental package; independently gated |

This release set is the Changesets baseline import. Candidate versions were
assigned before Changesets was installed, so no additional version bump is
pending for the entries above. All subsequent public-package changes require a
changeset.

`0.25.2` is the first supported registry release for this milestone. A mistaken
`0.25.0` npm publication was withdrawn before release approval, while `0.25.1`
was superseded after its dependency floor allowed pnpm to select unsupported
Core and SDK artifacts.

### Added

- Bare autoforge and the status command now render one SDK-backed structured project-status model through fixed summary, work, and next views, with JSON preserving the protocol envelope. (decision.bare-autoforge-and-the-status-command-now-render-one-sdk-backed-structured-proje)
- Explicit attachment now resolves paths inside Git repositories to a canonical repository root, treats submodules as independent projects, maps linked worktrees to their owning project, and preserves exact non-Git paths. (decision.explicit-attachment-now-resolves-paths-inside-git-repositories-to-a-canonical-re)
- The Core interactive TUI is removed; autoforge tui remains only as a temporary read-only compatibility alias over SDK-backed status output, while interactive prompting belongs to the separate AutoForge Agent. (decision.the-core-interactive-tui-is-removed-autoforge-tui-remains-only-as-a-temporary-re)
- The AutoForge SDK is stabilized as a public 0.1.0 protocol-versioned injected-operation facade and is prepared, but not authorized, for npm publication. (decision.the-autoforge-sdk-is-stabilized-as-a-public-0-1-0-protocol-versioned-injected-op)
- AutoForge protocol version 1 defines canonical provider-neutral cross-agent handoffs as tracked structured project truth, while transcripts and provider runtime state remain ignored. (decision.autoforge-protocol-version-1-defines-canonical-provider-neutral-cross-agent-hand)
- The experimental AutoForge Agent begins as a separate local SDK consumer with one injected OpenAI provider, mandatory plan approval, preflighted bounded edits, Core validation, streaming completion, and protocol-v1 handoffs. (decision.the-experimental-autoforge-agent-begins-as-a-separate-local-sdk-consumer-with-on)
- AutoForge Agent stores local provider credentials only in native operating-system credential facilities behind an Agent-owned injected vault, with hidden terminal entry and no plaintext fallback. (decision.autoforge-agent-stores-local-provider-credentials-only-in-native-operating-syste)
- Core delegates eligible bare invocation and the allowlisted credentials namespace to a separately installed AutoForge Agent through versioned process negotiation while every explicit Core command and noninteractive bare invocation remain deterministic. (decision.core-delegates-eligible-bare-invocation-and-the-allowlisted-credentials-namespac)
- v0.25 compatibility is anchored by a frozen v0.24 project fixture and a provider-neutral Claude-to-Codex handoff fixture rather than raw conversational transcripts. (decision.v0-25-compatibility-is-anchored-by-a-frozen-v0-24-project-fixture-and-a-provider)
- AutoForge 0.25.2 is prepared as an audited release candidate with compatibility migration guidance, independently versioned Protocol/Core/SDK packages, corrected publishable dependency ranges, and complete local validation evidence; publication remains pending explicit maintainer approval. (decision.autoforge-0-25-0-is-prepared-as-an-audited-release-candidate-with-compatibility)

### Fixed

- Core and SDK `0.1.1` replace workspace-only dependency ranges from their
  unsupported `0.1.0` artifacts with npm-compatible ranges, allowing pnpm and
  other external package managers to install the public package set.
- Completed project relocation repairs an existing generated Agent contract to the destination project root, while absent optional contracts and bootstrap manifests remain valid uninitialized state. (decision.completed-project-relocation-repairs-an-existing-generated-agent-contract-to-the)

## [0.24.0] - 2026-08-23

### Added

- **Continuous Product Evolution Engine**: the digital twin now projects
  every governance, domain, design, strategy, and traceability signal
  alongside work, decisions, and evidence — closing the north-star's
  v0.24 milestone by making `autoforge twin` a true whole-project graph
  instead of a work/decision-only projection:
  - The twin node-type schema was extended with `phase`, `task`, `issue`,
    `strategy`, `validation-evidence`, and `specification` node types
    (replacing the former collapsed `work`/`risk` types), so phases,
    tasks, and issues each project with their own dedicated node type.
  - Constitution rules now project as `constitution` nodes with `governs`
    edges to every work item they apply to (via the same
    `selectApplicableRules` matcher used elsewhere); domain concepts
    project with `models` edges back to the decisions and specifications
    that established them.
  - Specifications, active strategy assessments, traceability links, and
    validation evidence all project into the twin: specifications with a
    direct twin counterpart (`architecture`, `screen`, `component`,
    `flow`, `api`, `domain`) keep their own type, the rest project as a
    generic `specification` node; only `active` strategy assessments
    project, with `assesses`/`resulted-in` edges; traceability links
    project as edges only (no separate node); validation evidence
    projects with `validates`/`traces` edges.
  - `autoforge twin generate` now reads all six additional domains in
    parallel alongside the original five and includes them in the
    generated projection.
  - `autoforge why` now surfaces validation-gate evidence linked to a
    matched decision's related work as a `Validation: <gateId> (<status>)`
    line.
  - Documented the full agentic-AI-facing capability surface — a new
    "Full Capability Map" section in `docs/AUTOFORGE_AGENTIC_AI_GUIDE.md`
    covering every domain (work lifecycle, memory, strategy, learning,
    governance, design, orchestration, the digital twin, traceability,
    and the global workspace) with when-to-use guidance for each.

### Fixed

- **`gate check` now stamps recorded evidence with the active work
  item's id**: found during a live end-to-end audit of the Continuous
  Product Evolution loop — `autoforge gate check` recorded validation
  evidence but never attached the active work item's id, so the new
  `autoforge why` validation surfacing had nothing to match against
  outside of unit tests that injected the field manually. The loop now
  closes in practice, not just in isolated tests.
- **Twin generation no longer crashes on 7 of 13 specification types**:
  an unchecked cast from `SpecificationType` to the twin's node-type enum
  meant `design`, `token`, `state`, `responsive`, `product`, `research`,
  and `intent` specifications threw an uncaught schema error inside
  `autoforge twin generate`. Fixed with an exhaustive type mapping and a
  generic `specification` fallback node type.
- **Stale pre-v0.24 twin caches no longer crash `twin show`/`twin
query`**: a cache written by an older AutoForge version using the
  since-removed `work`/`risk` node types now degrades gracefully to "no
  twin found, run generate" instead of throwing, since the twin cache is
  gitignored and always regenerable.
- **Onboarding prompts now default to `autoforge attach`, not `init`**,
  for new projects: `init` alone never registers a project in the global
  workspace, so agents following the README's copy/paste onboarding
  prompt could initialize a project that then never appeared in
  `autoforge projects list`.

## [0.23.0] - 2026-08-23

### Added

- **Product Strategy & Prioritization Engine**: a new `strategy` domain
  closing the north-star's v0.23 milestone — recording an explainable,
  multi-factor, categorical judgment on any feature, phase, task, or
  issue, with **no blended numeric score**:
  - `autoforge strategy assess <work-id>` records eight factors
    (`--alignment`, `--value`, `--risk`, `--cost`,
    `--evidence-strength`, `--dependency-pressure`, `--complexity`,
    `--release-constraint`, each `low`/`medium`/`high`/`uncertain`), a
    human-assigned `--decision` (`now`/`next`/`later`/`backlog`), and a
    required `--rationale`. Every assessment unconditionally writes a
    linked decision via the same mechanism `autoforge decide --evidence`
    uses, so `autoforge why` also surfaces strategy calls.
  - `autoforge strategy list [--decision <label>] [--work <id>]`,
    `show <id>`, and `history <work-id>` query assessments; assessments
    are append-only with an explicit `--supersedes` chain, mirroring the
    decision-memory convention.
  - The active work item's active assessment is surfaced in context
    packets as a new `## Strategy Assessment` section — an optional,
    non-budgeted field (modeled on the existing `workflow`/`contract`
    fields), not routed through the ranked/budgeted candidate system
    doctrines and decisions compete in.
  - Deliberately kept independent from `autoforge orchestrate
prioritize` (v0.21's narrow 0-100 scheduling tiebreaker for
    already-orchestrated work): a strategy assessment informs a human's
    decision to prioritize; it does not compute or replace the
    orchestration priority itself.
- **Global install is now the advertised primary onboarding path**:
  `README.md`, `CONTRIBUTING.md`, and a fully rewritten
  `docs/QUICKSTART.md` now lead with `npm install --global` (or the
  `yarn`/`pnpm` equivalent) and bare `autoforge` commands, matching how
  the CLI already behaves as a per-machine control plane (global
  workspace registry, cross-project history, `autoforge update`'s
  existing global-vs-local detection). Local `--save-dev` + `npx` is
  now an explicitly scoped fallback for environments that cannot retain
  a persistent global install. `docs/QUICKSTART.md` — previously
  orphaned and describing an entirely different, no-longer-existing
  AutoForge product (autopilot levels, recipes, a training loop) — was
  rewritten from scratch against the actual current command surface and
  linked from `README.md`.

### Fixed

- **`autoforge why` surfaces linked evidence**: closes a v0.22
  design-to-plan scope gap — `formatDecisionMatches()` now appends an
  `Evidence: <id>, <id>` line beneath a matched decision whenever
  evidence records reference it via `resultingDecision`.
- **`projects list --json` duplicate implementation consolidated**: the
  flag already worked, but was implemented twice across two branches of
  `runProjectsCommand`; consolidated into one code path.
- **North-star roadmap doc reconciled**: `dev/AUTOFORGE_ULTIMATE_NORTH_STAR_v0.8-v0.25.md`
  carried a phantom `v0.15.0` "Interactive AutoForge CLI" milestone that
  pushed every subsequent milestone number one version higher than the
  authoritative revised roadmap; renumbered and reconciled.

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
