# AutoForge 0.10.0

AutoForge is a task-specific context and control plane for AI-assisted software development. It gives Codex, Claude Code, Gemini/Antigravity, Grok Build, Cursor, and generic agents durable project memory, governed work lifecycle, scoped edits, and explainable build packets.

## Release History

- **0.10.0** — Agent contract generation, capability validation, workflow enforcement, and contract-aware context packets.

- **0.9.0** — Workflow orchestration with persisted runs, conditional stages, automatic handoffs, workflow-aware context propagation, and symlink-safe CLI execution.

- **0.8.2** — Bug-fix release with deterministic workflow recommendations and planning handoff validation.

- **0.8.1** — Maintenance release with CI formatting and GitHub Actions runtime hardening.

- **0.8.0** — Intent and research knowledge contracts, deterministic triage and readiness, planning artifacts, knowledge/planning CLI commands, golden fixtures, and Planning Bundle synchronization.

- **0.7.1** — Corrective packaging release. Restores the published `bin/autoforge.js` launcher and keeps it aligned with the rewritten v0.7 CLI.
- **0.7.0** — Rewrite release with durable work state, decision memory, doctrines, typed specifications, explainable context packets, guardrails, migrations, adapters, TUI support, and Virdua dogfood validation.

## Install

```bash
npm install --save-dev @cojacklabs/autoforge
npx autoforge init
npx autoforge doctor
```

## Starting From Scratch

For a new project, ask your coding agent to set up AutoForge with this one-liner:

```text
Set up and use AutoForge for this repository: review `AGENTS.md` and the AutoForge agent guidance, run `npx --no-install autoforge doctor`, initialize only if this project is not already initialized, then inspect `npx --no-install autoforge context --explain`; summarize the detected project structure, active work, governing rules, and validation steps before making changes.
```

See `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md` for the complete safe setup procedure.
Agent behavior and long-prompt handling are documented in `docs/AUTOFORGE_AGENTIC_AI_GUIDE.md`.

After initialization, generate and validate the agent contract:

```bash
npx autoforge contract generate generic
npx autoforge contract validate
```

## Canonical Workflow

```bash
npx autoforge add feature --name "Payments" --description "Add payment support"
npx autoforge add phase --feature <feature-id> --name "Checkout" --description "Implement checkout"
npx autoforge add task --phase <phase-id> --name "Create checkout" --description "..." --include "src/**"
npx autoforge start task <task-id>
npx autoforge context --explain
npx autoforge check --path src/checkout.ts
npx autoforge gate check
npx autoforge done
```

## Agent Review Prompt

Copy and paste this one-liner into any supported agent before starting work:

```text
Review the repository's AutoForge instructions and current project infrastructure, bring your understanding up to date using `AGENTS.md`, `npx autoforge doctor`, and `npx autoforge context --explain`, then summarize the governing rules, active work, relevant decisions, and validation requirements before proceeding.
```

## Memory and Design

```bash
npx autoforge decide --statement "..." --reasoning "..." --consequence "..." --scope payments --keyword checkout
npx autoforge why --query checkout
npx autoforge why --history
npx autoforge doctrine
npx autoforge design validate dev/design/screen.md
npx autoforge design import dev/design/screen.md
```

Use `autoforge recap` for handoffs, `autoforge tui --snapshot` for automation, and `autoforge doctor` for installation health.

## Migration and Upgrade

For an existing 0.6 project, preview migration before changing state:

```bash
npx autoforge migrate --dry-run
npx autoforge migrate
```

Upgrade the package with your package manager, then run `npx autoforge doctor`.

## Supported Commands

The canonical command reference is `autoforge help`. The v0.7 surface is intentionally small: `init`, `add`, `start`, `recap`, `context`, `check`, `gate`, `done`, `decide`, `why`, `doctrine`, `design`, `migrate`, `tui`, `doctor`, `help`, and `version`.

Legacy orchestration, research, compliance, telemetry, snapshot, and prompt-loading commands are not supported in v0.7. See `dev/AutoForge_0.7.0_Subcommand_Lifecycle_Audit.md` for lifecycle decisions and future roadmap mapping.

## Development

```bash
npm run format:check
npm run typecheck
npm test
npm run build
```

See `dev/AutoForge_0.7.0_Rewrite_Development_Plan.md` and `dev/AutoForge_Development_Roadmap_0.8-0.10.md` for architecture and future direction.

Released under the [MIT License](LICENSE).
