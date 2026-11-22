# Priozar

> **Human intent. AI execution. One shared understanding.**

Priozar is a project-intelligence and orchestration framework for continuous
AI-assisted software, data, and AI development. It turns brainstorming,
research, planning, design, implementation, validation, and handoff into durable
project state that humans and different coding agents can share.

Priozar does not replace Codex, Claude Code, Cursor, Gemini, Grok, or another
agent. The Core CLI gives every agent the same scoped work, decisions,
governance, evidence, and next action instead of making each conversation start
from scratch.

Priozar owns deterministic project intelligence and orchestration—not model
reasoning or autonomous agency. A separately named future CoJack Labs AI may
consume Priozar, but general conversation, personal memory, model routing,
and prompt-to-product experiences are outside this framework's scope.

> Priozar is the new name of AutoForge. During the compatibility window,
> `@cojacklabs/priozar` provides both the `priozar` and the deprecated
> `autoforge` executables, and existing `.autoforge/` project state keeps
> working. See the
> [Priozar Brand Migration Guide](docs/PRIOZAR_BRAND_MIGRATION_GUIDE.md) to
> inspect or migrate existing projects.
>
> Always begin with `priozar version` and use explicit Core subcommands in
> automation.

## What v0.25 Provides

| Layer    | Package                        | Responsibility                                                                               |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| Protocol | `@cojacklabs/priozar-protocol` | Versioned contracts, capabilities, launch negotiation, and handoffs                          |
| Core     | `@cojacklabs/priozar-core`     | Deterministic, model-independent project intelligence                                        |
| SDK      | `@cojacklabs/priozar-sdk`      | Supported programmatic facade with injected filesystem, Git, clock, and storage effects      |
| Core CLI | `@cojacklabs/priozar`          | Project lifecycle, memory, governance, orchestration, validation, and compatibility behavior |
| Agent    | `@cojacklabs/priozar-agent`    | Historical experimental runtime; not the framework's future product direction                |

Core remains usable without an account, model provider, hosted service, or
Agent installation. A first-party AI, consumer billing, personal memory, and
prompt-to-product platform are not Priozar framework milestones.

## Install and Attach a Project

Use one global installation so projects share a workspace registry and update
path:

```bash
npm install --global @cojacklabs/priozar
# or: pnpm add --global @cojacklabs/priozar
# or: yarn global add @cojacklabs/priozar

priozar version
priozar attach "$PWD"
priozar --project "$PWD" doctor
priozar projects list
```

`attach` initializes local `.autoforge/` state and registers the Git repository
root globally. A nested path still attaches the whole repository. Use
`priozar init` only for an intentionally local-only environment such as a
disposable CI container.

For a local dependency instead, prefix commands with `npx`:

```bash
npm install --save-dev @cojacklabs/priozar
npx priozar init
npx priozar doctor
```

Upgrading from v0.24? Read the
[v0.25 migration guide](docs/planning/0.25/MIGRATION_GUIDE.md).

## The Continuous Priozar Loop

Priozar is most effective when it stays involved throughout the product
lifecycle, not only when code is written.

| Stage      | Human or agent activity                                              | Priozar capability                                 |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Brainstorm | Capture an idea without prematurely coding it                        | `intent assess`, `intent register`                 |
| Research   | Preserve findings and provenance                                     | `research register`, `knowledge`                   |
| Govern     | Check standing rules and domain invariants                           | `constitution`, `domain`, `doctrine`               |
| Design     | Validate screens, components, flows, states, and relationships       | `design validate`, `design import`, `design check` |
| Plan       | Turn intent into features, phases, tasks, issues, or workflows       | `planning`, `workflow`, `add`                      |
| Prioritize | Explain why work is now, next, later, or backlog                     | `strategy assess`                                  |
| Execute    | Open a scoped session and resolve the relevant context               | `start`, `context --explain`, `check`              |
| Validate   | Run retained quality/security checks and preserve evidence           | `gate check`, `evidence`                           |
| Remember   | Record why a choice was made and what it changes                     | `decide`, `why`, `changelog`                       |
| Handoff    | Transfer structured state between agents without transcripts         | `recap`, Protocol handoffs, `orchestrate handoff`  |
| Learn      | Connect hypotheses, experiments, and observations to later decisions | `learning`                                         |
| Reorganize | Reassess dependencies, priority, impact, and project location        | `orchestrate`, `trace`, `twin`, `projects`         |

Start every session by asking what is already true:

```bash
priozar --project "$PWD" doctor
priozar --project "$PWD" recap
priozar --project "$PWD" status --view next
```

When work is active, resolve the bounded execution packet before editing:

```bash
priozar --project "$PWD" context --explain
```

## From an Idea to Validated Work

Before creating structured JSON, inspect the installed schema rather than
guessing its shape:

```bash
priozar schemas list
priozar intent assess --schema
```

Then assess the idea, create scoped work, and complete it with durable rationale:

```bash
priozar intent assess product-idea.json --kind planning

priozar add feature --name "Customer onboarding" --description "Guide new customers to first value"
priozar add phase --feature <feature-id> --name "First-run flow" --description "Design and implement onboarding"
priozar add task --phase <phase-id> --name "Build first-run flow" --description "Implement the approved design" --include "src/**" --include "test/**"

priozar start task <task-id>
priozar context --explain
priozar check --path src/onboarding.ts
priozar gate check
priozar decide --statement "..." --reasoning "..." --consequence "..." --scope onboarding --keyword first-run --work <task-id> --kind feature-note
priozar done
```

`done` requires a decision linked with `--work` so completed work leaves an
explanation, not merely a changed Git tree. For genuinely trivial work, use
`priozar done --no-decision "<reason>"`; the bypass remains auditable.

For a new application idea that needs formal discovery, architecture, design,
data, and security approval, follow the
[bootstrap pipeline](docs/BOOTSTRAP_PIPELINE.md).

## Give This Prompt to Any Coding Agent

Use this at project onboarding, after a Priozar update, or when switching
between Claude, Codex, Cursor, Gemini, Grok, and another repository-aware agent:

```text
Use the globally installed Priozar CLI for this repository. Review `README.md` and follow the current documentation walkthrough in `docs/README.md` to use Priozar continuously throughout brainstorming, planning, documentation, design, bootstrapping, development, validation, decision-making, and handoff; follow every applicable `AGENTS.md` and summarize the project's current Priozar state before making changes.
```

The complete procedure is in the
[Agent Setup Guide](docs/PRIOZAR_AGENT_SETUP_GUIDE.md), and behavioral
guidance is in the [Agentic AI Guide](docs/PRIOZAR_AGENTIC_AI_GUIDE.md).

## Humans and Agents Share One Source of Truth

Durable project truth includes work, decisions, doctrines, governance, domain
knowledge, specifications, traceability, approved evidence, and structured
handoffs. Reproducible context packets, leases, provider caches, logs,
credentials, and raw transcripts are operational state and should not become
portable project memory.

Useful continuity commands:

```bash
priozar recap
priozar why --query "checkout"
priozar evidence summary
priozar twin generate
priozar twin query --type decision
```

See [Cross-Agent Handoffs](docs/CROSS_AGENT_HANDOFFS.md) and
[Governance and Memory](docs/GOVERNANCE_AND_MEMORY.md).

Code changes also follow the
[Code Commenting Standard](docs/CODE_COMMENTING_STANDARD.md): preserve
non-obvious intent without comment-density quotas, and link `TODO`/`FIXME`
markers to durable Priozar tasks or issues.

## Parallel Agent Work

Do not run multiple writing agents against the same checkout. Build a
dependency-aware orchestration plan, then let Priozar assign isolated
worktrees and reject overlapping write scopes:

```bash
priozar orchestrate plan orchestration-plan.json
priozar orchestrate ready
priozar orchestrate claim <work-id> --agent codex --role backend
priozar orchestrate explain <work-id>
priozar orchestrate status
priozar orchestrate handoff <assignment-id> handoff.json
priozar orchestrate release <assignment-id>
```

If `orchestrate explain` reports stale or unavailable context, stop, release the
claim, and reclaim it before editing.

## Core CLI and Agent Compatibility

Explicit subcommands are deterministic. Automation should use commands such as
`priozar status --json`, `priozar recap`, and `priozar gate check --json`.

The released CLI retains compatibility code for the historical experimental
Agent. That behavior does not establish a first-party Priozar Agent roadmap.
Automation should always use explicit deterministic subcommands. A later
compatibility issue will decide how bare invocation and Agent-launch shims are
retired without breaking supported installations.

Provider credentials remain in the operating-system credential store:

```bash
priozar credentials set openai
priozar credentials status openai
priozar credentials delete openai
```

See [Local Provider Credentials](docs/LOCAL_PROVIDER_CREDENTIALS.md).

## Documentation Map

Start with [docs/README.md](docs/README.md). It identifies current operational
guides, v0.25 release material, specialist references, and historical documents.
The authoritative product boundary is the
[Priozar Framework North-Star](docs/planning/0.26/AUTOFORGE_FRAMEWORK_NORTH_STAR.md).
The installed command remains the final authority for syntax:

```bash
priozar help
priozar schemas list
```

## Development and Release Validation

This repository uses pnpm 11 and Turborepo. From a clean checkout:

```bash
pnpm install --frozen-lockfile
pnpm workspace:check
pnpm exec turbo run build typecheck test format:check
pnpm release:status
```

The completed release sequence, validation evidence, known exclusions, and
follow-up work are documented in
[v0.25 Release Readiness](docs/planning/0.25/RELEASE_READINESS.md).

Released under the [MIT License](LICENSE).
