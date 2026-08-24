# AutoForge v0.25 Platform Migration Plan

## Status

Active; architecture reconciliation is in progress.

This document is the authoritative implementation plan for AutoForge Core
v0.25.

This plan supersedes the proposed v0.25 interactive TUI as the next Core
milestone. The existing slash-command design, implementation plan, commits, and
worktree remain preserved as source material for the future AutoForge Agent.
They must not be merged wholesale into AutoForge Core.

## Objective

Establish AutoForge as a platform with a stable, model-independent Core and
separate first-party Agent, Web, and hosted Service products while preserving
the working v0.24 CLI and project-state contracts throughout the migration.

The v0.25 release is a compatibility-first architectural migration. It extracts
and formalizes boundaries before expanding hosted or agentic behavior.

## Product Model

```text
Human intent
    |
    v
Agent interface
    |-- AutoForge Agent
    |-- Claude Code
    |-- Codex
    |-- Cursor / Gemini / Grok / hosted agents
    |
    v
Stable SDK / JSON / MCP protocol
    |
    v
AutoForge Core
    |-- project knowledge and memory
    |-- governance and domain intelligence
    |-- work, context, and agent contracts
    |-- orchestration and handoffs
    |-- validation, evidence, and digital twin
    |
    v
Bounded agent execution -> validation -> evidence -> updated project truth
```

AutoForge Core is not a reasoning model. AutoForge Agent is the first-party
interactive implementation built on Core, but third-party agents remain equal
consumers of the same protocol.

## Target Repository Structure

```text
autoforge/
|-- apps/
|   |-- core-cli/
|   |-- agent-cli/
|   |-- web/
|   `-- service/
|-- packages/
|   |-- protocol/
|   |-- core/
|   |-- sdk/
|   |-- providers/
|   |-- client/
|   `-- config/
|-- docs/
|-- turbo.json
|-- package.json
`-- pnpm-workspace.yaml
```

The migration must not create empty packages that imply unsupported products.
`apps/web`, `apps/service`, and hosted packages enter implementation only after
the local Core-to-Agent path is proven.

## Dependency Boundaries

1. `packages/protocol` imports no AutoForge package and performs no filesystem,
   Git, environment, network, credential, or provider access.
2. `packages/core` may depend on `protocol` but never on applications, model
   providers, authentication, billing, or hosted services.
3. `packages/sdk` exposes supported Core operations and returns protocol
   objects rather than terminal-formatted strings.
4. `packages/providers` implements model-provider capabilities without owning
   project state or Core orchestration logic.
5. Applications may import packages; packages must never import applications.
6. `agent-cli` uses the SDK for project operations and provider adapters for
   reasoning. It must not create parallel work, policy, context, or decision
   stores.
7. `web` communicates with `service` through the typed client and protocol.
8. Repository knowledge remains canonical unless a user explicitly enables a
   future cloud-synchronization feature.

Turborepo will coordinate the package task graph, affected-package execution,
local caching, and enforceable boundaries. Remote caching is optional and must
not be required for local development.

## Agreed Product Decisions

### Core command experience

Bare `autoforge` remains deterministic and noninteractive. It prints concise
project status, relevant next commands, and guidance to run `autoforge help`.

```bash
autoforge
autoforge status
autoforge status --json
autoforge status --view <view>
autoforge help
```

### TUI ownership

- Deprecate the interactive `autoforge tui` loop in Core.
- Replace read-only snapshots with `autoforge status`.
- Retain `tui --snapshot` temporarily as a compatibility alias.
- Move slash commands, guided wizards, free-text prompts, streaming, model
  calls, and coding actions to AutoForge Agent.

### Global workspace and Git roots

Projects enter the global workspace only through an explicit attachment:

```bash
autoforge attach <path>
autoforge attach <path> --dry-run
```

When the supplied path is inside a Git repository, AutoForge uses the complete
Git repository root as the project root. Subdirectories are not independently
attached. Git submodules are independent repositories; linked worktrees are
execution locations for the same AutoForge project. Non-Git projects use the
exact supplied directory.

Attachment performs local, read-only Git inspection. It must not fetch, commit,
change Git configuration, upload metadata, or register sibling repositories.

### Durable and operational state

Tracked project intelligence:

- work definitions;
- decisions;
- governance and domain knowledge;
- specifications and traceability;
- approved evidence and durable architecture/product knowledge.

Ignored operational state:

- active sessions and leases;
- generated context packets and caches;
- temporary worktrees and logs;
- machine-specific paths;
- provider credentials;
- raw provider conversations.

### Session continuity

AutoForge transfers structured outcomes rather than raw transcripts. A canonical
handoff records project/session/agent identity, active work, scope, Git refs,
changed files, decisions, validation, risks, open questions, next action, and a
context fingerprint. Raw transcript archival is out of scope and disabled by
default.

### Local and hosted operation

AutoForge Agent must remain usable without an AutoForge account:

```text
Agent CLI -> local Core -> provider API using local BYOK credentials
```

Hosted operation is additive:

```text
Agent CLI -> AutoForge Service -> managed model gateway -> provider
```

Provider secrets never enter tracked Core state. Hosted BYOK storage is deferred
until a dedicated encryption, access-control, and retention design is approved.

## Migration Phases

### Phase 1: Architecture and governance

- Record the Core/Agent/Web/Service boundary as a durable decision.
- Reconcile the canonical north-star documents with this plan.
- Mark the prior v0.25 TUI plan as superseded for Core while preserving it.
- Define package names, ownership, dependency rules, and versioning policy.
- Select one internal workspace package manager; the recommended choice is pnpm.

Exit gate: the new architecture and compatibility promises are reviewable before
any source relocation begins.

### Phase 2: Workspace foundation

- Introduce pnpm workspace configuration and a Turborepo task graph.
- Define package-level build, typecheck, test, format, and boundary checks.
- Preserve the existing `@cojacklabs/autoforge` package and `autoforge` binary.
- Add affected-package CI while retaining a full Core compatibility gate.
- Avoid a required hosted remote cache.

Exit gate: the existing v0.24 source and tests run successfully through the new
workspace task graph without behavioral changes.

### Phase 3: Protocol and Core extraction

- Extract versioned schemas and serialized contracts into `packages/protocol`.
- Extract application/domain services into `packages/core` one bounded domain at
  a time.
- Inject filesystem, Git, clock, and global-storage dependencies explicitly.
- Keep project state backward-compatible and readable without destructive
  migration.

Exit gate: protocol tests run independently, Core has no forbidden application
or provider dependency, and existing project fixtures remain readable.

### Phase 4: Deterministic Core CLI

- Convert command routing and terminal formatting into `apps/core-cli`.
- Make the CLI a thin consumer of supported Core/SDK services.
- Add bare status, `status --json`, and status views.
- Add Git-root-aware `attach --dry-run` and conflict diagnostics.
- Deprecate the interactive TUI and preserve `tui --snapshot` as a temporary
  status alias.

Exit gate: the globally installed command remains compatible, deterministic,
and noninteractive, with stable structured output and exit codes.

### Phase 5: SDK and handoff protocol

- Publish supported operations for attachment, status, intent, work, context,
  guardrails, assignments, decisions, validation, handoffs, and completion.
- Formalize the tracked/ignored state split.
- Implement provider-neutral structured handoffs.
- Add a Claude-to-Codex handoff fixture proving continuity without transcripts.
- Begin capability and protocol-version negotiation.

Exit gate: an external agent can complete the normal work lifecycle without
parsing human-oriented terminal output.

### Phase 6: Experimental local Agent

- Create `apps/agent-cli` as an experimental SDK consumer.
- Reuse concepts from the preserved TUI worktree rather than merging its Core
  implementation wholesale.
- Support one provider, streaming text, intent clarification, plan review,
  explicit approval, bounded edits, validation, and handoff.
- Keep local BYOK credentials in operating-system credential storage.

Exit gate: one approved local prompt can produce scoped, validated work through
the SDK without an AutoForge account.

### Phase 7: Compatibility, hardening, and release

- Fix missing optional-store behavior, including absent bootstrap manifests.
- Repair stale project-root references in generated contracts after relocation.
- Verify atomic writes, interrupted sessions, lease recovery, and stale context.
- Run package-boundary, protocol, migration, foundation, legacy, and end-to-end
  tests.
- Publish deprecations, migration guidance, changelog, and release-readiness
  evidence.

Exit gate: all v0.24 projects load without knowledge loss, the existing binary
remains installable, and every changed behavior is compatible or explicitly
deprecated.

## Deferred Beyond the v0.25 Release Gate

- Production Web application;
- payments and subscription management;
- production hosted Service/model gateway;
- cloud project-state synchronization;
- every model provider;
- autonomous multi-model collaboration;
- native Homebrew, Scoop, Chocolatey, WinGet, and Linux installers;
- hosted provider-key custody;
- raw transcript storage.

These capabilities may be developed after the local Core/SDK/Agent boundary is
validated. They should have independent product milestones and release gates.

## Compatibility and Rollback Strategy

- Keep `v0.24.0` as the immutable known-good baseline.
- Move one domain or command at a time with focused commits.
- Do not combine source relocation with behavioral redesign.
- Preserve the `@cojacklabs/autoforge` package name and `autoforge` executable
  throughout v0.25.
- Keep state schemas backward-readable and require dry-run previews for any
  migration that writes durable state.
- Maintain temporary aliases for renamed commands.
- If a phase fails its gate, revert that bounded extraction without discarding
  unrelated project memory or later planning artifacts.

## v0.25 Validation Requirements

- All v0.24 project fixtures load without migration loss.
- Existing supported commands retain behavior or produce documented
  deprecation guidance.
- Core has no dependency on Agent, providers, Web, Service, billing, or auth.
- Protocol schemas are versioned and independently tested.
- Turborepo package-boundary checks pass.
- Package build, typecheck, format, and tests pass.
- Full foundation and legacy suites pass before release.
- Bare `autoforge` and `status --json` work inside and outside projects.
- `attach --dry-run` covers repository roots, nested paths, submodules,
  worktrees, conflicts, and non-Git projects.
- A cross-agent structured-handoff fixture passes without raw transcripts.
- No credentials, raw conversations, or machine-specific state enter tracked
  project artifacts.
- The experimental Agent completes one locally approved and validated SDK
  workflow.

## Completion Definition

v0.25 is complete when AutoForge v0.24 project intelligence operates through a
stable protocol, Core, SDK, and deterministic CLI boundary; the interactive TUI
has a documented migration path; and an experimental first-party Agent proves
the boundary without making Core depend on a model provider or hosted account.
