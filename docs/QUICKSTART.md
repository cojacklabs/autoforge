# AutoForge Quickstart

Get up and running with AutoForge in a few minutes.

## Install

Install AutoForge globally so every project on the machine shares one CLI,
one global workspace registry, and one update path:

```bash
npm install --global @cojacklabs/autoforge
# or: yarn global add @cojacklabs/autoforge
# or: pnpm add --global @cojacklabs/autoforge
```

Install as a local dev dependency only for environments that cannot hold a
persistent global install — a dedicated CI runner or container with only
Node available:

```bash
npm install --save-dev @cojacklabs/autoforge
```

Every command below assumes a global install (bare `autoforge`). Prefix each
one with `npx` instead if you installed locally.

## New project

```bash
autoforge attach "$PWD"
autoforge doctor
```

`attach` initializes `.autoforge/` and `autoforge.config.json` and registers
the project in the global workspace in one step, so it appears in
`autoforge projects list`. `doctor` verifies the installation is healthy
before you start work. Use plain `autoforge init` instead only when you
deliberately want a local-only install with no global registry entry (for
example, a disposable CI container) — `init` alone does not register the
project globally.

## Existing project on a new machine or with a new agent

```bash
autoforge --project "$PWD" doctor
autoforge --project "$PWD" bootstrap status
```

Then read `docs/AUTOFORGE_CLI_REFERENCE.md` for the complete current command
surface, and `AGENTS.md` when present. See README's "Starting From Scratch"
section for the canonical onboarding prompt to hand a newly assigned agent.

## Add and run work

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

`start` opens a session scoped to the task's declared file patterns.
`context --explain` compiles a build packet for the active work and explains
what was included or excluded and why. `done` requires at least one decision
linked to the active work item — pass `autoforge done --no-decision "<reason>"`
to bypass for trivial work; the reason is itself recorded as an auditable
decision.

## Query project memory

```bash
autoforge why --query checkout
autoforge why --history
autoforge recap
```

`why` searches recorded decision rationale. `recap` summarizes current work
and session state — the fastest way to answer "what's next" at the start of
a session.

## Keep the installation current

```bash
autoforge update
```

Resolves the version currently published on npm, installs it, and uses
`--global` automatically when the running installation is global.

## Learn more

- `docs/AUTOFORGE_CLI_REFERENCE.md` — the complete, currently maintained
  command surface across every domain (memory, strategy, learning, design,
  governance, orchestration, and more).
- `docs/AUTOFORGE_AGENT_SETUP_GUIDE.md` — the complete safe setup procedure
  for assigning an agent to a project.
- `docs/BOOTSTRAP_PIPELINE.md` — the end-to-end bootstrap-to-release flow.
- `README.md` — project overview, multi-agent orchestration, and the
  canonical onboarding prompt.
