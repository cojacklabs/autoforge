# AutoForge 0.7.0 — Phase 0 Architecture Audit

Status: Complete  
Audit date: 2026-08-19  
AutoForge version audited: 0.6.0  
Upstream reference: `piotrjura/pm`  
Upstream commit audited: `b9e6edac60b3261f76305e72d878198ff283e4fd`  
Upstream package version: 0.5.3

## 1. Executive Decision

AutoForge should proceed with the 0.7 rewrite as a context and control plane.

The current 0.6 architecture should not be incrementally expanded into 0.7. Its CLI, packaged framework tree, prompt collection, orchestration runtime, state mechanisms, and documentation are too tightly coupled to the previous multi-agent software-factory product definition.

The rewrite should preserve selected behavior and data concepts while creating a new TypeScript application under `src/`. The existing 0.6 implementation should remain intact during the foundation and kernel phases so migration behavior can be developed and tested against real legacy artifacts.

`pm` provides a useful reference for work state, decisions, doctrines, sessions, hook behavior, recovery, and CLI discipline. AutoForge should independently implement these concepts behind its own domain interfaces rather than copy `pm` modules wholesale.

The minimum viable 0.7 architecture is:

```text
CLI
  -> application services
    -> domain models
      -> filesystem repositories

agent adapters
  -> application services

context resolver (later phase)
  -> work + decisions + doctrines + specifications
```

## 2. Audit Scope and Method

This audit covers:

- the current AutoForge CLI and package boundaries
- scripts and runtime services
- persistent and generated state
- memory, governance, prompts, quality, research, and evidence features
- tests and schemas
- the pinned upstream `pm` source, tests, doctrines, storage, hooks, work model, decision model, recovery, and TUI
- licensing and attribution risk
- the migration disposition of current and upstream capabilities
- the minimum architecture required for Phase 1

No production source code was modified during Phase 0.

The current AutoForge baseline was validated with `npm test`: 17 tests passed across 5 suites. The run emitted Node experimental warnings for `node:sqlite`.

## 3. Current AutoForge Inventory

### 3.1 Package and runtime boundary

AutoForge 0.6 is an ES module Node.js package with one executable, `bin/autoforge.js`. The package publishes:

- `dist/`
- `bin/autoforge.js`
- `scripts/`
- `LICENSE`

The build process does not compile an application. It copies a broad whitelist of repository directories into `dist/`, including AI prompts, policies, scripts, documentation, schemas, tests, diagrams, research material, evidence material, and operational templates.

Initialization then copies most of `dist/` into a host project's `.autoforge/` directory. The result is a framework snapshot rather than a small runtime state directory.

Observed installation characteristics:

- many product and development documents are copied into the host project
- agent prompts and role definitions are installed as runtime context
- executable framework scripts are copied into the host project
- generated state and framework templates share the same directory tree
- upgrades replace the installed framework tree while preserving selected paths

This boundary is incompatible with the 0.7 goal of providing only task-relevant context.

### 3.2 CLI commands

The 0.6 CLI implements:

| Command              | Current responsibility                                | Finding                                        |
| -------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| `init`               | Copy framework distribution and generate config       | Rewrite                                        |
| `configure`          | Generate managed target YAML files                    | Rewrite into config/spec registration behavior |
| `snapshot`           | Generate `REPO.md` through Repomix                    | Defer                                          |
| `load`               | Print large orchestrator context                      | Remove                                         |
| `autopilot`          | Plan or start multi-agent recipe runs                 | Defer                                          |
| `research scan`      | Detect risk triggers and generate readiness docs      | Defer                                          |
| `readiness check`    | Check security/privacy/accessibility artifacts        | Defer                                          |
| `gate check`         | Execute project quality gates                         | Keep and rewrite later                         |
| `audit`              | Generate compliance evidence                          | Defer                                          |
| `train`              | Derive prompt improvements from telemetry             | Remove from 0.7 scope                          |
| `metrics`            | Aggregate orchestration telemetry                     | Defer; replace with context metrics later      |
| `status`             | Display orchestrated run status                       | Remove; `recap` replaces relevant behavior     |
| `approve`            | Resolve orchestration approvals                       | Defer                                          |
| `update` / `upgrade` | Check package version and replace installed framework | Rewrite after migration design                 |
| `doctor`             | Validate installation files                           | Keep and rewrite                               |
| `refresh`            | Generate a large context reload prompt                | Remove; context packets replace it             |
| `version`            | Print package version                                 | Keep                                           |
| `help`               | Print command usage                                   | Keep as canonical command source               |

The CLI file also owns filesystem operations, package installation behavior, orchestration commands, telemetry output, research commands, evidence commands, update behavior, context prompt generation, and error presentation. This is the primary package-level monolith to eliminate.

### 3.3 Scripts and services

| Module                           | Responsibility                                        | Architectural finding                                 |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `scripts/orchestrator_kernel.js` | Recipe planning, run creation, risk and approval flow | Old product core; defer                               |
| `scripts/run_store.js`           | SQLite work items, runs, approvals, gates, events     | Do not reuse as kernel store                          |
| `scripts/research_engine.js`     | Risk scanning and readiness artifact generation       | Optional later capability                             |
| `scripts/telemetry_collector.js` | JSONL events and prompt improvement suggestions       | Training function is out of scope                     |
| `scripts/evidence_manager.js`    | Compliance gate and approval evidence                 | Optional later capability                             |
| `scripts/run_quality_gates.js`   | Sequential project validation                         | Valuable capability; rewrite behind service interface |
| `scripts/apply_config.js`        | Generate managed target manifests                     | Replace with typed config and registries              |
| `scripts/build_dist.js`          | Copy framework tree into `dist`                       | Replace with TypeScript bundling                      |
| `scripts/generate_snapshot.js`   | Repomix wrapper                                       | Defer                                                 |
| `scripts/validate_context.js`    | Validate installed context tree                       | Replace with schema/config validation                 |
| `scripts/validate_artifacts.js`  | JSON-schema validation                                | Reuse concepts, not implementation                    |
| `scripts/export_datasets.js`     | Export model-training datasets                        | Remove from 0.7 scope                                 |
| `scripts/update_autoforge.js`    | npm update helper                                     | Defer until packaging is stable                       |

The `ai/runtime` directory contains a second orchestration path centered on a coordinator and PM/UI/UX/engineering/QA adapters. It reads policies, loads role memory, plans writes, applies writes, and appends telemetry. This duplicates responsibilities found in the CLI and scripts and should not become a 0.7 compatibility layer.

### 3.4 State and memory

AutoForge 0.6 uses several unrelated persistence mechanisms:

| Location                              | Format   | Purpose                                           |
| ------------------------------------- | -------- | ------------------------------------------------- |
| `.autoforge/runtime/autoforge.db`     | SQLite   | Work items, runs, approvals, gate results, events |
| `.autoforge/training/telemetry.jsonl` | JSONL    | Training and execution telemetry                  |
| `.autoforge/ai/logs/activity.jsonl`   | JSONL    | Runtime activity                                  |
| `.autoforge/ai/memory/*.md`           | Markdown | Global and role memory                            |
| `.autoforge/ai/memory/learnings.yaml` | YAML     | Applied prompt learnings                          |
| `evidence/*.json`                     | JSON     | Compliance evidence                               |
| `change_requests/*.yaml`              | YAML     | Change intake                                     |
| `ideas/*.yaml`                        | YAML     | Idea intake                                       |

There is no single state ownership model, shared schema version, transaction boundary, or migration path across these stores. The SQLite store relies on experimental `node:sqlite`, while other writers use synchronous direct file writes or appends.

For 0.7, the initial kernel should use typed, versioned filesystem state with atomic replacement. It should not retain SQLite merely because 0.6 used it.

Recommended persistence classes:

```text
Commit-capable project knowledge:
- decisions
- doctrines customized by the project
- specifications
- work definitions when the project chooses to commit them

Ephemeral local runtime state:
- active session
- edit/read counters
- doctrine pull state
- generated context packets
- adapter health cache
```

### 3.5 Governance and permissions

Current governance is distributed across:

- `ai/policies/governance.yaml`
- `ai/policies/session_policy.yaml`
- `ai/rules/*.md`
- `ai/rules/enforcement.yaml`
- `ai/rules/execution_policies.yaml`
- `policies/*.yaml`
- `autoforge.config.json`
- generated `ai/code_targets.yaml`
- generated `ai/context_targets.yaml`

Useful concepts include:

- allowed code roots
- apply/write permission controls
- approval requirements
- quality gate requirements
- change traceability
- bounded agent behavior

The problem is not the existence of controls; it is that controls are duplicated across human documents, prompts, YAML files, runtime code, and generated files. The 0.7 kernel should define one typed enforcement model, then let adapters translate supported rules into agent-specific mechanisms.

### 3.6 Prompts and agents

AutoForge ships more than 30 prompt files and many role definitions spanning architecture, engineering, QA, UI/UX, product, compliance, security, SRE, payments, data, research, and orchestration.

Findings:

- prompts encode both behavior and product knowledge
- several prompts overlap with governance rules and documentation
- role-specific context encourages loading more material than the current task needs
- the coordinator simulates multiple roles within one runtime
- command documentation and runtime instructions are duplicated

The prompt library should not be migrated as a unit. Small, behavior-only doctrines may be extracted from valuable rules. Product/system knowledge belongs in specifications or decisions. Agent identities and persona prompts are not kernel responsibilities.

### 3.7 Specifications and schemas

Existing structured artifacts include:

- JSON Schemas for user asks, code plans, test plans, issue reports, design specs, and style-guide diffs
- OpenAPI documentation
- blueprint vision, technology, and specification documents
- UI/UX style guides, flows, wireframes, and accessibility guidance
- Mermaid diagrams
- quality and deployment configuration

These are useful source materials for designing the specification registry, but most are not yet normalized into addressable specifications with stable IDs and relationships.

The existing `DesignSpec.v1` and related schemas should be evaluated as migration inputs, not adopted as the new registry schema without revision.

### 3.8 Quality, research, evidence, and operations

Quality gates are the strongest existing capability aligned with a control plane. They can provide validation requirements to build packets and later execute checks through `autoforge check`.

Research, readiness, compliance evidence, training, deployment, and autonomous orchestration are useful in other product modes but are not required to prove the 0.7 kernel. They should remain outside the initial dependency graph.

### 3.9 Current tests

The current test suite covers:

- SQLite run-store operations
- orchestration dry runs and lifecycle
- risk research and artifact generation
- evidence recording and traceability matrices
- telemetry aggregation and suggestions

It does not cover:

- CLI routing as an integration boundary
- initialization safety and upgrade restoration
- prompt/context loading behavior
- config generation
- path and symlink boundaries
- package contents
- concurrent state writes
- corruption recovery

The existing tests are a useful legacy safety net but do not define the new kernel contract.

## 4. Pinned `pm` Architecture Audit

### 4.1 Source boundary

The audited `pm` revision is a TypeScript ES module CLI bundled by `tsup`, tested by Vitest, and distributed with `dist/` plus ten doctrine Markdown files.

Its source is separated into:

- command modules
- a store module
- a hook and enforcement module
- config, initialization, argument, formatting, and version helpers
- React/Ink TUI components
- small doctrine documents

This separation is substantially better than AutoForge 0.6's CLI boundary, although `pm` still concentrates many enforcement and context responsibilities in `src/lib/hooks.ts`.

### 4.2 Work model

`pm` models:

```text
Feature
  -> Phase
    -> Task

Issue
```

It supports draft/planned/in-progress/done feature states, task lifecycle and retries, issue priorities, reviews, activity logs, issue-to-feature upgrades, task selection, cleanup, and sweeping outstanding work.

Concepts to adapt:

- explicit active work
- feature/phase/task hierarchy
- issue as small work
- idempotent lifecycle operations
- issue-to-feature escalation
- recovery of stale work
- task-scoped file tracking
- concise recap output

Concepts not to copy directly:

- fixed file/edit thresholds as universal domain truth
- implicit selection of the first non-done issue as active
- domain state and append-log operations that each reload and rewrite the full file
- permissive recovery from corrupt state by silently returning an empty store

AutoForge should explicitly represent a single active work reference and make scope policy configurable.

### 4.3 Storage model

`pm` stores all durable work, decisions, and activity in `.pm/data.json`. It stores workflow configuration, edit tracking, and doctrine pull tracking in separate JSON files.

Strengths:

- local and inspectable
- no service or database requirement
- simple backup and migration surface
- easy test fixtures

Weaknesses:

- synchronous direct writes
- no atomic temp-file replacement
- no lock or optimistic concurrency check
- partial writes may result in an empty in-memory store
- no runtime schema validation on loaded state
- migrations are ad hoc property checks tied to package version
- durable knowledge and ephemeral session data are not assigned an explicit Git policy

AutoForge should adapt the filesystem-first principle while replacing the implementation with schema-validated repositories, atomic writes, backups, and explicit migrations.

### 4.4 Decision model and relevance

`pm` attaches decisions to features, tasks, or issues. A decision includes statement, optional reasoning, optional action, and timestamp. `pm why` searches decision and reasoning text. Prompt hooks perform stop-word filtering, token overlap scoring, adaptive thresholds, and result caps.

Concepts to adapt:

- decisions persist with work
- decisions are searchable without embeddings
- relevant decisions are pushed into active context
- deterministic ranking and result caps
- issue-to-feature upgrade preserves decisions

AutoForge needs a richer independent decision record with stable ID, scope, keywords, consequences, related work, supersession, and status. Decisions should be stored in a first-class repository rather than only nested inside work objects.

### 4.5 Doctrine system

`pm` ships ten small Markdown doctrines:

- router
- planning
- questions
- followup
- decisions
- scope
- sizing
- sweep
- recovery
- subagents

The router is injected at session start. Individual doctrine reads are tracked per session. Required doctrines can hard-block edits; medium-level doctrines produce advisory prompts.

Concepts to adapt:

- small behavior-only documents
- always-loaded router
- on-demand doctrine selection
- session pull tracking
- distinction between advisory and blocking requirements
- one canonical CLI help source rather than commands repeated in doctrines

AutoForge should add task-domain routing such as frontend, backend, design, security, testing, database, accessibility, and deployment. These should remain behavior rules, not repositories of system facts.

### 4.6 Hooks and enforcement

`pm` installs five Claude Code hook behaviors:

- pre-edit active-work, doctrine, and scope enforcement
- pre-read exploration counting
- post-edit file/edit tracking
- prompt-context injection
- session-start recovery and briefing

It merges hooks into project settings and self-heals them on later CLI invocations.

Concepts to adapt:

- hook installation as adapter behavior
- repeated health verification
- active-work enforcement
- pre/post edit scope tracking
- session-start recovery
- prompt-context delivery
- agent-specific capability reporting

Implementation risks not to inherit:

- Claude settings manipulation inside core business logic
- global user permission mutation as an implicit initialization side effect
- fail-open behavior for corrupt or unreadable state without a visible diagnostic
- hard-coded `pm` command strings and Claude event formats in domain services
- exemption rules embedded in a large hook module

The AutoForge kernel must not import a Claude adapter. Adapters should translate typed enforcement and context results into supported agent mechanisms.

### 4.7 Recovery mechanisms

`pm` includes:

- stale-task detection using task start time and session file modification time
- explicit cleanup and force-reset commands
- issue-to-feature upgrade preserving prior decisions and observed edits
- hook self-healing
- idempotent start/done behavior
- end-of-work sweep

These are useful patterns. AutoForge should adapt recovery as explicit application services with auditable outcomes. It should not silently treat state corruption as an empty project.

### 4.8 TUI

`pm` uses React and Ink for feature, issue, task, decision, setting, and initialization views. The TUI reads the same store functions used by CLI commands.

The shared-service principle is worth preserving. React/Ink and the current component implementation should not be adopted during the kernel phases. AutoForge's TUI remains deferred until domain and application APIs stabilize.

### 4.9 Upstream test strategy

`pm` has materially broader behavioral coverage than AutoForge 0.6, including:

- command lifecycle integration tests
- decision matching and context injection
- doctrine routing and hard-block enforcement
- scope escalation and issue upgrades
- stale-work recovery
- hook installation and self-healing
- worktree path normalization
- idempotent state transitions
- bridge/import behavior
- TUI rendering support

AutoForge should adapt these test categories while writing original fixtures and assertions for its own schemas and adapter contracts.

## 5. Licensing and Attribution Finding

The audited upstream revision presents inconsistent license evidence:

- the GitHub repository page and README state `MIT`
- the audited tree contains no `LICENSE` file
- the audited `package.json` contains no `license` field

This audit does not treat the README label alone as sufficient provenance for copying implementation files into AutoForge.

Required policy:

1. Architecture and behavior may be independently reimplemented.
2. Do not copy upstream source or doctrine text until the copyright holder provides or checks in an explicit license grant covering the audited source.
3. If source is later adapted under a confirmed MIT license, preserve the complete license text and copyright notice required by that grant.
4. Record the source repository, commit SHA, source paths, AutoForge destination paths, adaptation date, and nature of changes in a third-party notices file.
5. Do not use upstream branding or imply endorsement.
6. Recheck the upstream license at the exact revision selected for implementation; do not rely on `main` remaining unchanged.

Until clarified, Phase 1 and later tasks should use `pm` only as an architectural reference.

## 6. Migration Matrix

### 6.1 KEEP

These capabilities align with the new product and may retain their behavior, data, or tests after being placed behind the new architecture.

| Capability                        | Source    | Decision | Migration note                                                    |
| --------------------------------- | --------- | -------- | ----------------------------------------------------------------- |
| npm-installed CLI                 | AutoForge | KEEP     | Replace entry implementation with compiled TypeScript             |
| local-first operation             | Both      | KEEP     | No required service or database                                   |
| quality gates                     | AutoForge | KEEP     | Expose later through `check`; separate discovery from execution   |
| workspace/code boundaries         | AutoForge | KEEP     | Normalize paths and enforce through adapters                      |
| installation health checks        | AutoForge | KEEP     | Rebuild `doctor` around typed checks                              |
| semantic version command          | AutoForge | KEEP     | Use package metadata service                                      |
| work/decision persistence concept | Both      | KEEP     | New schemas and repositories                                      |
| human-readable project artifacts  | Both      | KEEP     | Markdown/front matter for doctrines and specs                     |
| existing 0.6 tests                | AutoForge | KEEP     | Preserve as legacy regression evidence until features are retired |

### 6.2 REWRITE

| Capability          | Current problem                               | Rewrite direction                                           |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| CLI router          | One file owns all command concerns            | Thin router to command/application services                 |
| initialization      | Copies the framework repository into projects | Create only typed `.autoforge` state and selected templates |
| configuration       | Generates duplicated YAML manifests           | One versioned Zod config schema                             |
| storage             | SQLite plus JSONL/YAML/Markdown stores        | Typed filesystem repositories with atomic writes            |
| memory              | Role Markdown, YAML learnings, telemetry      | Decisions, work history, specs, and explicit project memory |
| agent manifests     | Persona-oriented and static                   | Capability-aware adapter registry                           |
| prompt architecture | Large role/policy prompt collection           | Small doctrines plus task-specific packets                  |
| orchestration flow  | Multi-role recipe runner                      | Application services around active work and context         |
| path controls       | Distributed generated config                  | Canonical resolved-path scope model                         |
| package build       | Copies broad repository tree                  | `tsup` bundle plus deliberate runtime assets                |
| documentation       | Command syntax duplicated                     | Generated/canonical CLI reference                           |
| update/migration    | Replaces installed framework tree             | Detect, back up, migrate, report, validate                  |
| existing schemas    | Artifact-specific and disconnected            | Versioned domain schemas and registry schemas               |

### 6.3 ADAPT FROM `pm`

These are concepts to implement independently unless licensing provenance is resolved.

| Concept                            | Adaptation                                                      |
| ---------------------------------- | --------------------------------------------------------------- |
| Feature -> Phase -> Task and Issue | Adopt as kernel work aggregate with explicit active reference   |
| Start/done lifecycle               | Use validated, idempotent state transitions                     |
| Recap                              | Compose active work, recent decisions, status, and next actions |
| Decision search                    | Deterministic lexical scoring before embeddings                 |
| Relevant decision injection        | Feed resolver and adapter context delivery                      |
| Small doctrines and router         | Create original AutoForge doctrines with session tracking       |
| Scope tracking                     | Track canonical project-relative edits by active work           |
| Issue escalation                   | Make thresholds configurable and preserve prior work            |
| Session recovery                   | Use explicit stale policy and audit recovery actions            |
| Hook health/self-healing           | Implement within adapters with safe merge semantics             |
| Advisory vs hard enforcement       | Represent as adapter capability and enforcement result          |
| CLI help as source of truth        | Generate documentation or reference the CLI output              |
| Shared CLI/TUI services            | Keep domain logic independent of presentation                   |

### 6.4 NEW IN AUTOFORGE

| Capability                          | Reason                                                  |
| ----------------------------------- | ------------------------------------------------------- |
| specification registry              | System facts need structured, addressable storage       |
| relationship graph abstraction      | Context must traverse direct system relationships       |
| context resolver                    | Central 0.7 product capability                          |
| context ranking and budget          | Bound task context and report reduction                 |
| inclusion/exclusion reasons         | Make resolver behavior inspectable                      |
| build packet compiler               | Deliver ordered, reproducible agent context             |
| multi-agent adapter interface       | Separate core from Claude, Codex, and future agents     |
| committed/ephemeral artifact policy | Keep knowledge durable without committing session noise |
| context golden tests                | Prove both inclusion and exclusion behavior             |

### 6.5 DEFER

| Capability                              | Revisit condition                                  |
| --------------------------------------- | -------------------------------------------------- |
| autonomous autopilot                    | Kernel and context resolver proven                 |
| recipe-driven multi-agent orchestration | Demonstrated need beyond adapter routing           |
| research scanner                        | Can consume/produce registry specs cleanly         |
| readiness artifact generator            | Core health and spec model stable                  |
| SOC 2 / ISO evidence automation         | Core event model stable                            |
| approval workflow                       | Required by a concrete adapter or control use case |
| training telemetry                      | Context metrics demonstrate need                   |
| dataset export                          | Explicit model-training product decision           |
| Repomix snapshot command                | Resolver shows remaining whole-repo snapshot need  |
| package self-update helper              | 0.7 packaging and migration stable                 |
| Figma integration                       | Manual design specs prove the registry             |
| TUI                                     | CLI/application service contracts stable           |

### 6.6 REMOVE

| Capability                                       | Reason                                      |
| ------------------------------------------------ | ------------------------------------------- |
| `autoforge load` giant context output            | Violates minimum-useful-context principle   |
| `autoforge refresh` reload prompt                | Replaced by resolver and adapter delivery   |
| copied framework tree in host projects           | Mixes product source, templates, and state  |
| role/persona prompt catalog as kernel            | AutoForge is not a second coding agent      |
| single-session simulated multi-agent coordinator | Outside context/control-plane purpose       |
| automatic prompt training loop                   | Outside 0.7 purpose and difficult to govern |
| duplicated command syntax in docs/prompts        | Causes drift                                |
| mandatory whole-repository ingestion             | Directly conflicts with 0.7 mission         |
| production dependency on experimental SQLite     | Unnecessary for initial filesystem state    |

## 7. Minimum Phase 1 Architecture

Phase 1 should build infrastructure only. It must not port work behavior, decisions, doctrines, context selection, adapters, or legacy capabilities.

### 7.1 Required source boundary

```text
src/
  cli/
    index.ts
    router.ts
    help.ts
  core/
    config.ts
    errors.ts
    logger.ts
    paths.ts
    project.ts
  state/
    schemas.ts
    store.ts
    migrations.ts
  commands/
    init.ts
    doctor.ts
```

This is intentionally smaller than the final proposed source tree. Empty domain directories should not be scaffolded until a phase owns them.

### 7.2 Dependency direction

```text
cli -> commands/application -> core/state

core/state must not import:
- concrete commands
- CLI presentation
- agent adapters
- hooks
- TUI components
```

Future domains should depend on repository interfaces or narrow store abstractions, not raw filesystem operations scattered through commands.

### 7.3 Foundation decisions

Phase 1 should establish:

- Node.js support policy, recommended minimum Node 20 or newer
- TypeScript strict mode
- ES modules
- Zod schemas for config and state envelopes
- Vitest
- `tsup`
- a compiled executable at `dist/cli.js`
- package exports/files restricted to compiled code and intentional assets
- a single CLI parsing/routing mechanism
- typed application errors mapped to stable exit codes
- injectable logger/output ports for tests
- project-root discovery independent of `process.cwd()` globals
- canonical project-relative path helpers
- atomic JSON write using same-directory temporary file and rename
- backup/recovery behavior for invalid state
- explicit schema version separate from package version
- migration registry keyed by schema version
- dependency injection for filesystem/time/ID generation where tests benefit

### 7.4 Initial runtime structure

Phase 1 initialization should create no more than:

```text
.autoforge/
  config.json
  state/
    metadata.json
```

Later phases should add their own files through migrations. Phase 1 should not install the legacy `ai/`, `docs/`, `scripts/`, `devops/`, or policy trees.

### 7.5 State envelope

The foundation should define an envelope before domain schemas:

```ts
interface StateEnvelope<T> {
  schemaVersion: number;
  updatedAt: string;
  data: T;
}
```

Writes should:

1. validate input
2. serialize deterministically
3. write a temporary sibling file
4. flush/close where supported
5. rename over the destination
6. preserve or produce a recoverable backup according to policy

Concurrent write policy must be explicit before hooks are added. At minimum, a write should detect that the source revision changed between read and replace and fail with a recoverable conflict rather than silently overwrite another process.

### 7.6 Configuration minimum

The Phase 1 config should contain only foundation settings:

```text
schemaVersion
projectId
contextBudget
defaultAgent (optional)
artifact Git policy
```

Do not migrate 0.6 quality, persona, context target, or orchestration configuration into the new schema during Phase 1.

### 7.7 CLI minimum

Phase 1 CLI behavior:

```text
autoforge help
autoforge version
autoforge init
autoforge doctor
```

`init` must:

- discover and validate the project root
- refuse destructive overwrite by default
- detect a legacy `.autoforge` installation
- report that migration is not implemented yet
- never delete or replace legacy data
- support temporary-repository integration tests

`doctor` must initially validate:

- supported Node version
- project root
- config presence and schema
- state metadata presence and schema
- filesystem readability/writability
- legacy installation detection

### 7.8 Required Phase 1 tests

Unit tests:

- config defaults and validation
- path normalization and containment
- state envelope validation
- atomic store success and failure recovery
- migration dispatch
- application error mapping

Integration tests using temporary repositories:

- help and version
- fresh init
- repeated init
- init with malformed config
- legacy installation detection without mutation
- doctor success and actionable failures
- packaged CLI execution after build

Security/path tests:

- `..` traversal rejection
- absolute path handling
- symlink escape handling
- Windows separator normalization where applicable

### 7.9 Phase 1 exclusions

Do not implement in Phase 1:

- features, phases, tasks, or issues
- decisions
- doctrines
- specifications
- context selection or packets
- hooks
- concrete agent adapters
- TUI
- migration of legacy content
- quality gate execution
- research, compliance, telemetry, or autopilot behavior

## 8. Cross-Phase Risks and Required Decisions

These decisions must be resolved before or during the indicated phase.

| Risk/decision                                | Deadline                             | Recommendation                                                           |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| upstream licensing inconsistency             | Before copying any upstream material | Independently implement; request explicit upstream license file          |
| 0.6 CLI compatibility                        | Before public 0.7 beta               | Publish removed/deferred command map; avoid silent behavior changes      |
| committed work state policy                  | Before Phase 2                       | Make policy configurable but default durable knowledge to commit-capable |
| concurrent CLI/hook writes                   | Phase 1                              | Atomic writes plus conflict detection                                    |
| one versus multiple active work items        | Phase 2                              | One explicit active reference per project/worktree session               |
| worktree behavior                            | Phase 2                              | Resolve common project identity with worktree-local session state        |
| deterministic decision ranking               | Phase 3                              | Document tokenizer, scoring, tie breaks, and result limits               |
| doctrine precedence                          | Phase 4                              | Project override > bundled doctrine, with provenance                     |
| adapter capability parity                    | Phase 5                              | Report unsupported enforcement; never simulate hard enforcement          |
| specification IDs and relationship integrity | Phase 6                              | Namespaced IDs, typed edges, cycle-safe traversal                        |
| context token estimation                     | Phase 7                              | Stable estimator abstraction and explicit mandatory content              |
| packet overflow                              | Phase 8                              | Fail or truncate by declared section priority with explanation           |
| symlink/path enforcement                     | Phase 9                              | Compare canonical real paths against canonical allowed roots             |
| legacy backup format                         | Phase 13                             | Immutable timestamped backup plus migration report                       |

## 9. Recommended Implementation Sequence After Approval

Phase 1 should be split into constrained tasks:

1. Add TypeScript, Vitest, and `tsup` configuration.
2. Define core errors, logger contract, and project discovery.
3. Define path normalization and containment helpers with tests.
4. Define config/state envelopes and Zod schemas.
5. Implement atomic filesystem store and migration registry.
6. Implement thin CLI router with help and version.
7. Implement safe `init` and legacy detection.
8. Implement foundation `doctor` checks.
9. Add temporary-repository and packaged-CLI integration tests.
10. Replace package build metadata only after the compiled CLI passes.

Each task should stop after its targeted tests, typecheck, lint, and build verification. Phase 2 should not begin automatically.

## 10. Phase 0 Gate Result

Phase 0 gate: **PASS WITH LICENSING RESTRICTION**.

Completed:

- AutoForge CLI, scripts, state, memory, governance, prompts, quality, research, tests, and package boundaries inventoried
- pinned `pm` storage, work, decisions, doctrines, sessions, hooks, scope, recovery, TUI, and tests audited
- migration matrix produced
- minimum Phase 1 architecture defined
- baseline AutoForge tests executed successfully
- licensing and attribution requirements documented

Restriction:

- upstream implementation and doctrine text must not be copied until the missing explicit license artifact is resolved for the chosen source revision

No production source changes were made.
