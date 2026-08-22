# AutoForge 0.15.1

AutoForge is a task-specific context and control plane for AI-assisted software development. It gives Codex, Claude Code, Gemini/Antigravity, Grok Build, Cursor, and generic agents durable project memory, governed work lifecycle, scoped edits, and explainable build packets.

## Release History

- **0.15.1** — Maintenance release for the global agent onboarding prompt, synchronized agent guidance, focused release history, and dependency cleanup.

## Install

```bash
npm install --save-dev @cojacklabs/autoforge
npx autoforge init
npx autoforge doctor
```

## Starting From Scratch

For a new project, an existing project, an AutoForge upgrade, or a newly assigned agent, use this canonical one-liner:

```text
We will use the globally installed AutoForge CLI for this repository (available via [GitHub](https://github.com/cojacklabs/autoforge "AutoForge - GitHub"): run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`, initialize or attach the project only when needed, refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.
```

Use this prompt at initialization, after upgrading AutoForge, and whenever a new agent joins the project. It ensures agents use the current global CLI rather than a stale local bundle.

### Project Constitution (v0.15)

Projects can make governance explicit and reviewable through the constitution workflow:

```bash
npx autoforge constitution init
npx autoforge constitution list
npx autoforge constitution show <rule-id>
npx autoforge constitution check "<objective>"
```

`constitution check` evaluates the objective against scoped governance rules and reports conflicts before implementation. Existing projects remain compatible; initialization is additive and stores the constitution under `.autoforge/governance/`.

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
