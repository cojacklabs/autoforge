# AutoForge

AutoForge is a task-specific context and control plane for AI-assisted software development. It gives Codex, Claude Code, Gemini/Antigravity, Grok Build, Cursor, and generic agents durable project memory, governed work lifecycle, scoped edits, and explainable build packets.

## Install

Install AutoForge globally so every project on the machine shares one CLI,
one global workspace registry, and one update path:

```bash
npm install --global @cojacklabs/autoforge
# or: yarn global add @cojacklabs/autoforge
# or: pnpm add --global @cojacklabs/autoforge

autoforge init
autoforge doctor
```

Install as a local dev dependency only for environments that cannot hold a
persistent global install — a dedicated CI runner or container with only
Node available and no retained global package cache:

```bash
npm install --save-dev @cojacklabs/autoforge
npx autoforge init
npx autoforge doctor
```

See `docs/QUICKSTART.md` for the full first-session walkthrough (adding
work, running it, and querying project memory).

## Starting From Scratch

For a new project, an existing project, an AutoForge upgrade, or a newly assigned agent, use this canonical one-liner:

```markdown
We will use the globally installed AutoForge CLI for this repository (available via https://github.com/cojacklabs/autoforge): run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`; if `.autoforge/` is absent, run `autoforge attach "$PWD"` to initialize the project and register it in the global workspace in one step (`autoforge init` alone only creates local `.autoforge/` state — it does not register the project, so it will not appear in `autoforge projects list`; use plain `init` only when you deliberately want a local-only install with no global registry entry, such as a disposable CI container); refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; read `docs/AUTOFORGE_CLI_REFERENCE.md` for the complete current command surface so you can govern, scaffold, categorize, organize, prioritize, and reorganize this project's work using the full AutoForge CLI; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.
```

Use this prompt at initialization, after upgrading AutoForge, and whenever a new agent joins the project. It ensures agents use the current global CLI rather than a stale local bundle.

### Project Constitution (v0.15)

Projects can make governance explicit and reviewable through the constitution workflow:

```bash
autoforge constitution init
autoforge constitution list
autoforge constitution show <rule-id>
autoforge constitution check "<objective>"
```

`constitution check` evaluates the objective against scoped governance rules and reports conflicts before implementation. Existing projects remain compatible; initialization is additive and stores the constitution under `.autoforge/governance/`.

See `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md` for the complete safe setup procedure.
Agent behavior and long-prompt handling are documented in `docs/AUTOFORGE_AGENTIC_AI_GUIDE.md`.

### Bootstrap Artifacts and Gates

Bootstrap tracks required artifacts while the intent, workflow, planning,
design, and research commands produce them. Connect completed work back to the
bootstrap manifest with evidence-backed approval:

```bash
autoforge bootstrap approve architecture --evidence architecture-v1
autoforge bootstrap gates
```

See `docs/BOOTSTRAP_PIPELINE.md` for the complete end-to-end flow.

After initialization, generate and validate the agent contract:

```bash
autoforge contract generate generic
autoforge contract validate
```

## Canonical Workflow

```bash
autoforge add feature --name "Payments" --description "Add payment support"
autoforge add phase --feature <feature-id> --name "Checkout" --description "Implement checkout"
autoforge add task --phase <phase-id> --name "Create checkout" --description "..." --include "src/**"
autoforge start task <task-id>
autoforge context --explain
autoforge check --path src/checkout.ts
autoforge gate check
autoforge decide --statement "..." --reasoning "..." --consequence "..." --scope checkout --keyword payments --work <task-id> --kind feature-note
autoforge done
```

`autoforge done` on a task or issue requires at least one decision whose
`--work` links to the active work item — this is what makes the last two
lines above ordered, not optional. Pass
`autoforge done --no-decision "<reason>"` to bypass for trivial work; the
reason is itself recorded as an auditable decision.

## Multi-Agent Orchestration

For parallel planning, design, implementation, testing, and validation, create
a dependency-aware orchestration plan instead of starting multiple agents
against the same checkout:

```bash
autoforge orchestrate plan orchestration-plan.json
autoforge orchestrate ready
autoforge orchestrate claim <work-id> --agent codex --role backend
autoforge orchestrate status
autoforge orchestrate explain <work-id>
autoforge orchestrate prioritize <work-id> 100
autoforge orchestrate handoff <assignment-id> handoff.json
```

Mutating assignments receive isolated Git worktrees under the global
AutoForge home, and overlapping write scopes are rejected. Read-only research
sessions may run concurrently. High-risk architecture, security, and release
work must pass explicit approval gates before it becomes ready.

Every claim compiles a role-aware context packet from canonical AutoForge work,
doctrines, decisions, specifications, and the configured context budget. Run
`autoforge orchestrate explain <work-id>` before continuing an assignment; a
`stale` context result means canonical sources changed and the work should be
released and reclaimed before editing continues.

## Memory and Design

```bash
autoforge decide --statement "..." --reasoning "..." --consequence "..." --scope payments --keyword checkout --kind bugfix
autoforge why --query checkout
autoforge why --history
autoforge changelog compile
autoforge doctrine
autoforge design validate dev/design/screen.md
autoforge design import dev/design/screen.md
```

Use `autoforge recap` for handoffs, `autoforge tui --snapshot` for automation, and `autoforge doctor` for installation health.

When a registered project changes location, preserve its global history with:

```bash
autoforge projects relocate <path|project_name> <new-path> --planned
# Move the directory, then complete the registry and storage migration:
autoforge projects relocate <path|project_name> <new-path>
```

`autoforge projects move` is an equivalent alias.

## JSON Input Schemas

Commands that accept JSON files expose their runtime schemas directly:

```bash
autoforge schemas list
autoforge schemas show intent-assess
autoforge intent assess --schema
autoforge workflow handoff --schema
```

## Migration and Upgrade

For an existing 0.6 project, preview migration before changing state:

```bash
autoforge migrate --dry-run
autoforge migrate
```

Update a global installation to the version currently published on npm:

```bash
autoforge update
```

The command resolves the npm version, installs that exact version, and uses `--global` when the running AutoForge installation is global. Verify with `autoforge version` and `autoforge doctor`.

## Supported Commands

The canonical command reference is `autoforge help`; it includes the complete current command surface, including `update` for safely upgrading a global installation.

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
