# AutoForge Guide for Agentic AI

This document is intended for Codex, Claude Code, Cursor, Gemini,
Antigravity, and other repository-aware agents.

## Where to Read Instructions

Review these sources in order:

1. Repository `AGENTS.md` files, from the repository root toward the active file.
2. `README.md` and the AutoForge documentation in `docs/`.
3. Project-local `.autoforge/agent-contract.json`, when present.
4. `autoforge --project "$PWD" doctor` for installation and project health.
5. `autoforge --project "$PWD" recap` for active work and handoffs.
6. `autoforge --project "$PWD" context --explain` for the scoped execution packet when active work exists.

Use [`docs/README.md`](README.md) to distinguish current guides from historical
plans. Treat `autoforge help`, runtime schemas, and the project-local contract
as more authoritative than examples in an older design document.

## Continuous Interaction Contract

AutoForge should remain synchronized throughout the conversation:

1. At intake, classify the request as brainstorming, research, architecture,
   design, planning, implementation, data, or security work.
2. Before implementation, persist the intent, unknowns, acceptance criteria,
   governance, design contracts, and scoped work that matter.
3. During implementation, update durable decisions, evidence, risks, and work
   status when reality changes the plan.
4. At every handoff, preserve structured project truth and one next action.
5. At completion, run validation, link rationale to the work item, and close the
   session through AutoForge.

Do not create an AutoForge artifact for every sentence. Persist information
that another person or agent would need after the conversation disappears.

## Handling Unstructured Prompts

Do not immediately translate a long prompt into code. First:

1. Preserve the user's raw intent.
2. Extract the objective, requirements, assumptions, unknowns, constraints, and acceptance criteria.
3. Run `autoforge --project "$PWD" intent assess <intent.json> --kind <work-kind>`.
4. Follow the recommended workflow stages.
5. When `.autoforge/orchestration/state.json` exists, run
   `autoforge --project "$PWD" orchestrate status` and claim only work reported
   by `autoforge --project "$PWD" orchestrate ready`.
6. After claiming, inspect `orchestrate explain <work-id>` and stop when its
   `contextFreshness` is `stale` or `unavailable`.
7. Use the role-scoped context embedded in the assignment packet; do not replace
   it with an unbounded repository scan.
8. Create or update research, design, planning, and work artifacts as needed.
9. Resolve context before editing files.
10. Respect the active contract, scope, prohibited actions, and validation requirements.
11. Persist durable decisions and stage handoffs before completion.

## Initialization

For a new persistent project, run `autoforge attach "$PWD"` only when
`.autoforge/` does not already exist. This initializes the Git repository root
and registers it globally. Use `autoforge init` only for a deliberately
local-only environment. Then generate and validate the contract:

```bash
autoforge --project "$PWD" contract generate <agent-id>
autoforge --project "$PWD" contract validate
```

Never delete or replace existing `.autoforge/` state without explicit approval.

When no work is active, assess or create scoped work before editing. When work
is active, do not broaden its include/exclude patterns without explicit human
direction and a durable planning update.

## Bootstrap Production and Approval

Treat the bootstrap manifest as the readiness index, not the artifact authoring
tool. Use `intent`, `workflow`, `planning`, `design`, and `research` to produce
the backing work, then run `autoforge bootstrap approve <artifact-id>
--evidence <path|workflow-id>` to connect validated evidence to the manifest.
Never edit `manifest.json` manually.

Before creating any JSON input, run `autoforge schemas list` and inspect the
relevant contract with `autoforge schemas show <id>` or the command's
`--schema` flag.

## Full Capability Map

AutoForge is a control plane, not just a task tracker. Before assuming a
capability is missing, check this map — the exact command syntax for
everything below is in `docs/AUTOFORGE_CLI_REFERENCE.md`, which is the
canonical source of truth; this section explains _when_ to reach for each
domain.

### Work lifecycle (features, phases, tasks, issues)

`add` / `start` / `context --explain` / `check` / `gate check` / `decide` /
`done`. Every unit of work is scoped by file-include/exclude patterns, so
`context --explain` compiles only the relevant packet rather than the whole
repository. `done` refuses to complete work with no linked decision unless
you explicitly pass `--no-decision "<reason>"` — this is deliberate, not a
bug: it forces every completed unit of work to leave a durable trace of
_why_ it was done.

### Memory and rationale (`decide`, `why`, `doctrine`)

`decide` is the single durable record of _why_ something was done, changed,
or rejected — link it to work via `--work <id>` and to supporting evidence
via `--evidence <id>`. `why --query <text>` searches all of it back later;
`why --history` walks supersession chains. `doctrine` holds standing rules
of thumb distinct from one-off decisions. Prefer recording a decision over
leaving reasoning only in a commit message or PR description — commit
messages aren't queryable by `why`.

### Strategy and prioritization (`strategy`)

`strategy assess <work-id>` records an explainable, multi-factor judgment
(alignment/value/risk/cost/evidence-strength/dependency-pressure/complexity/
release-constraint, each `low`/`medium`/`high`/`uncertain`) plus a human
`now`/`next`/`later`/`backlog` decision label — no blended numeric score.
Every assessment writes a linked decision automatically. Use this when a
human (or you, on their behalf) needs to explain _why_ something is
prioritized the way it is, not merely _that_ it is. This is distinct from
`orchestrate prioritize`, which is only a 0-100 scheduling tiebreaker for
work already inside an active orchestration plan — reach for `strategy`
first; reach for `orchestrate prioritize` only once a plan exists and two
ready items need an ordering nudge.

### Learning and evidence (`learning hypothesis|experiment|evidence`)

Use this domain when a change is a bet, not a certainty: record a
`hypothesis` with an expected outcome and metric, track an `experiment`
that tests it, and capture `evidence` (nine kinds, from `analytics` to
`ai-evaluation`) that confirms or refutes it. Evidence can link to an
experiment, a hypothesis, and a work item simultaneously. Feed evidence
into `decide --evidence <id>` or `strategy assess --evidence <id>` to
close the loop from observation to decision.

### Governance and domain intelligence (`constitution`, `domain`)

`constitution` holds human-approved rules with explicit scope (paths, work
kinds, releases, tags) and a MUST/MUST_NOT level — run
`constitution check "<objective>"` before starting ambiguous or
higher-risk work to surface conflicts early, not after implementation.
`domain` holds the project's durable concept model (entities, relationships,
invariants) with provenance back to the decisions and specs that established
each concept; `domain check` preserves unknown invariant evidence rather
than treating it as silently verified — an unresolved invariant is a signal
to investigate, not a false pass.

### Design and specifications (`design`, `workflow`)

`design validate|import|update` brings screens, flows, components, and
other specification types into AutoForge's durable specification store,
with relationships (`uses`, `implements`, etc.) between them. `workflow
start <id> <kind>` runs a structured multi-stage process (architecture
change, design creation, feature development, and their aliases) when work
needs more ceremony than a single task — use it for changes that touch
architecture or need explicit design sign-off before implementation.

### Multi-agent orchestration (`orchestrate`)

Use this whenever more than one agent (or one agent across multiple
worktrees) needs to work the same project concurrently. `orchestrate plan`
compiles a dependency-aware queue; `ready` returns only work that's safe to
start now; `claim` takes an exclusive scope lease and isolated Git
worktree for writes (read-only claims don't block writers); `explain
<work-id>` reports `contextFreshness` — treat `stale`/`unavailable` as a
hard stop, release, and reclaim before continuing. Never start parallel
agents against the same checkout without a plan; that's exactly the
failure mode this domain exists to prevent.

### The digital twin (`twin`)

`twin generate` projects all durable state — work, decisions, evidence,
governance, domain concepts, specifications, strategy assessments,
traceability links, and validation evidence — into one queryable graph of
nodes and edges. Use `twin query --type <type> --relationship <name>` to
answer structural questions across domains at once (e.g., "which
constitution rules govern this task," "what validates this decision") that
would otherwise require manually cross-referencing several stores. The
twin is a derived, gitignored cache: regenerate it with `twin generate`
after state changes rather than trusting a stale copy, and treat a missing
or unreadable cache as "run generate first," not an error.

### Traceability (`trace`)

`trace add <source> <relationship> <target>` records an explicit link
(e.g., a task `implements` a feature, a test `verifies` a requirement).
These links surface as edges in the twin and via `trace impact <artifact>`
for forward/reverse blast-radius queries — use `trace impact` before
changing or removing something you suspect other artifacts depend on.

### Global workspace (`projects`, `attach`, `detach`)

AutoForge tracks a machine-wide registry of every project it manages.
Always run `autoforge attach "$PWD"` (not bare `init`) when onboarding a
new project, so it registers in the global workspace and appears in
`autoforge projects list` — `init` alone only creates local `.autoforge/`
state. Use `projects relocate` after moving a project's directory, and
`projects list` to discover other AutoForge-managed projects on the same
machine.

## Remote and Local Documentation

The canonical documentation is available in the repository GitHub source and
the installed package. After initialization, the project-local `.autoforge/`
state is authoritative for that project's work, decisions, contracts,
workflows, and context. Do not substitute global or unrelated project memory.
