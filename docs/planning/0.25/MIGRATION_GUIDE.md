# AutoForge 0.25 Migration Guide

## Who Should Read This

This guide is for users upgrading the existing `@cojacklabs/autoforge` CLI and
for integrators adopting the new Protocol, Core, SDK, or experimental Agent
packages. The migration preserves the existing package name, `autoforge`
executable, explicit Core commands, project state, and global project registry.

## Upgrade the Core CLI

Upgrade through the existing global installation path, then verify both the
installation and each project:

```bash
npm install --global @cojacklabs/autoforge@0.25.0
autoforge version
autoforge --project "$PWD" doctor
autoforge --project "$PWD" bootstrap status
```

No destructive project-state migration is required for a supported 0.24
project. Work, sessions, decisions, doctrines, specifications, governance,
strategy, traceability, and validation evidence remain Core-owned project
truth. A frozen 0.24 fixture verifies that work and session envelopes load
without mutation or data loss.

Use `autoforge attach "$PWD"` when placing a project into the global workspace.
`autoforge init` intentionally remains local-only and does not register the
project globally.

## Bare Invocation and Automation

Bare `autoforge` now launches the separately installed AutoForge Agent only
when stdin and stdout are interactive terminals and the Agent supports the
launcher protocol. It retains deterministic status when invoked from CI, a
pipe, redirected output, a recursive Agent process, an installation without a
compatible Agent, or with `AUTOFORGE_NO_AGENT=1`.

Automation should always use explicit Core commands:

```bash
autoforge status --json
autoforge recap
autoforge context --explain
autoforge gate check --json
```

Every explicit Core subcommand bypasses interactive Agent delegation.

## TUI Deprecation

The old interactive Core TUI has moved out of Core. `autoforge tui` temporarily
remains a read-only compatibility alias over deterministic status, and
`autoforge tui --snapshot` remains suitable for existing noninteractive usage.
Interactive prompting belongs to `autoforge-agent`.

The compatibility alias is retained through 0.26 and may be removed no earlier
than 0.27 with release notes.

## Optional Experimental Agent

The Agent is an independently versioned, optional package. Its v0.25 workspace
remains private while the experimental runtime completes its separate release
approval. After that package is publicly approved and available, install it
with:

```bash
npm install --global @cojacklabs/autoforge-agent
autoforge-agent version --json
autoforge
```

Its initial local workflow supports one OpenAI provider, streaming responses,
intent clarification, plan review, explicit approval, bounded edits, Core
validation, and structured handoff. Credentials are stored through native
operating-system credential facilities and never in project files or plaintext
fallback storage.

Core proxies only the allowlisted credential namespace:

```bash
autoforge credentials set openai
autoforge credentials status openai
autoforge credentials delete openai
```

The deterministic Core CLI remains fully usable without the Agent, an
AutoForge account, or a hosted service.

## Programmatic Packages

The first public library versions are independently versioned:

- `@cojacklabs/autoforge-protocol@^0.1.0`
- `@cojacklabs/autoforge-core@^0.1.0`
- `@cojacklabs/autoforge-sdk@^0.1.0`

Protocol defines serialized contracts and capability negotiation. Core owns
project intelligence and accepts external effects through injected ports. SDK
is the supported programmatic facade. Consumers should depend on the SDK unless
they are implementing a Core adapter or Protocol integration.

The release order is Protocol, Core, SDK, then the Core CLI. This ensures a
normal npm installation can resolve the Core CLI's declared `^0.1.0` runtime
dependencies. Agent and Providers remain independently versioned.

## Cross-Agent Continuity

Claude, Codex, and other agents resume through validated protocol-v1 handoffs
under `.autoforge/handoffs/`. Handoffs contain project/session identity, active
work, scope, Git references, changed files, decisions, validation, risks, open
questions, next action, and a context fingerprint. Raw transcripts, provider
messages, credentials, caches, and machine-specific runtime state are excluded.

## Project Relocation and Optional State

When moving a registered repository, record the plan before moving it and then
complete relocation afterward:

```bash
autoforge projects relocate <path|project_name> <new-path> --planned
autoforge projects relocate <path|project_name> <new-path>
```

Completed relocation migrates path-derived global storage and repairs an
existing Agent contract's absolute project root. Missing Agent contracts and
bootstrap manifests are valid optional state. `bootstrap status` reports
`not-scaffolded` with the scaffold command instead of throwing a filesystem
error.

## Rollback

Keep the 0.24.0 package available as the immutable known-good CLI baseline. If
the new CLI cannot load a project, stop before writing state, capture
`autoforge doctor` output, and reinstall the prior package version. Do not
delete `.autoforge/`; its tracked project knowledge is the recovery source.

No release should be published until the maintainer completes the separate
human code audit and explicitly approves the release.
