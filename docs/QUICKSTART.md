# Priozar Quickstart

Get from an idea to one validated, resumable work item in a few minutes. For
the broader documentation map, start at [`docs/README.md`](README.md).

## Install

Install Priozar globally so every project on the machine shares one CLI,
one global workspace registry, and one update path:

```bash
npm install --global @cojacklabs/priozar
# or: yarn global add @cojacklabs/priozar
# or: pnpm add --global @cojacklabs/priozar
```

Install as a local dev dependency only for environments that cannot hold a
persistent global install — a dedicated CI runner or container with only
Node available:

```bash
npm install --save-dev @cojacklabs/priozar
```

Every command below assumes a global install (bare `priozar`). Prefix each
one with `npx` instead if you installed locally.

## New project

```bash
priozar attach "$PWD"
priozar doctor
```

`attach` initializes `.autoforge/` (including its `config.json`) and registers
the project in the global workspace in one step, so it appears in
`priozar projects list`. `doctor` verifies the installation is healthy
before you start work. Use plain `priozar init` instead only when you
deliberately want a local-only install with no global registry entry (for
example, a disposable CI container) — `init` alone does not register the
project globally.

## Existing project on a new machine or with a new agent

```bash
priozar version
priozar --project "$PWD" doctor
priozar --project "$PWD" bootstrap status
priozar --project "$PWD" recap
```

Then read `docs/PRIOZAR_CLI_REFERENCE.md` for the complete current command
surface, and `AGENTS.md` when present. See README's "Give This Prompt to Any
Coding Agent" section for the canonical onboarding prompt.

If work is active, run `priozar --project "$PWD" context --explain` before
editing. If no work is active, capture the request as intent or create scoped
work instead of relying on the current chat as the plan.

## Assess an idea before coding

Inspect the runtime schema, create a project-contained JSON file, and assess
the intent:

```bash
priozar intent assess --schema
priozar intent assess product-idea.json --kind planning
```

The assessment recommends deterministic workflow stages. Use `research`,
`design`, `planning`, and `workflow` when the idea needs evidence, UI/UX
contracts, generated planning artifacts, or formal approvals before it becomes
an implementation task.

## Add and run work

```bash
priozar add feature --name "Payments" --description "Add payment support"
priozar add phase --feature <feature-id> --name "Checkout" --description "Implement checkout"
priozar add task --phase <phase-id> --name "Create checkout" --description "..." --include "src/**"
priozar start task <task-id>
priozar context --explain
priozar check --path src/checkout.ts
priozar gate check
priozar decide --statement "..." --reasoning "..." --consequence "..." --scope checkout --keyword payments --work <task-id> --kind feature-note
priozar done
```

`start` opens a session scoped to the task's declared file patterns.
`context --explain` compiles a build packet for the active work and explains
what was included or excluded and why. `done` requires at least one decision
linked to the active work item — pass `priozar done --no-decision "<reason>"`
to bypass for trivial work; the reason is itself recorded as an auditable
decision.

## Query project memory

```bash
priozar why --query checkout
priozar why --history
priozar recap
```

`why` searches recorded decision rationale. `recap` summarizes current work
and session state — the fastest way to answer "what's next" at the start of
a session.

For a handoff to another agent, also preserve validation, risks, open questions,
changed files, and one next action. Use structured handoffs rather than copying
the raw transcript; see [`CROSS_AGENT_HANDOFFS.md`](CROSS_AGENT_HANDOFFS.md).

## Continue the loop

After one item completes:

```bash
priozar recap
priozar strategy list --decision next
priozar orchestrate ready
priozar trace impact <artifact>
```

Not every project uses orchestration or traceability. These commands make the
next step explicit when the project grows beyond a linear task list.

## Keep the installation current

```bash
priozar update
```

Resolves the version currently published on npm, installs it, and uses
`--global` automatically when the running installation is global.

## Learn more

- `docs/PRIOZAR_CLI_REFERENCE.md` — the complete, currently maintained
  command surface across every domain (memory, strategy, learning, design,
  governance, orchestration, and more).
- `docs/PRIOZAR_AGENT_SETUP_GUIDE.md` — the complete safe setup procedure
  for assigning an agent to a project.
- `docs/BOOTSTRAP_PIPELINE.md` — the end-to-end bootstrap-to-release flow.
- `README.md` — project overview, multi-agent orchestration, and the
  canonical onboarding prompt.
- `docs/README.md` — current documentation map and historical-material policy.
