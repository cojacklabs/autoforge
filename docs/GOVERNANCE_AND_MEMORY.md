# Governance and Memory

AutoForge separates durable project truth from reproducible or machine-local
runtime state. This lets humans and different agents continue the same project
without storing entire conversations or provider credentials in the repository.

## Durable Project Truth

Persist information when another contributor will need it after the current
session disappears:

| Concern                             | AutoForge domain                              |
| ----------------------------------- | --------------------------------------------- |
| Objectives and scoped work          | features, phases, tasks, issues, sessions     |
| Architectural and product rationale | `decide`, `why`                               |
| Standing behavior rules             | `doctrine`, `constitution`                    |
| Domain concepts and invariants      | `domain`                                      |
| Intent, research, and planning      | `intent`, `research`, `knowledge`, `planning` |
| UI/UX and technical contracts       | `design`, specifications, `trace`             |
| Prioritization rationale            | `strategy`                                    |
| Validation and observations         | `gate`, `evidence`, `learning`                |
| Agent continuity                    | protocol handoffs and `recap`                 |

Good memory is structured and selective. Record the decision, evidence, risk,
open question, changed files, and next action—not every conversational turn.

## Operational State

Context packets, orchestration leases, generated twin projections, provider
caches, logs, and raw transcripts are reproducible or machine-specific. They
should be ignored by Git unless a documented contract explicitly says
otherwise. Provider credentials belong only in the operating-system credential
store.

See [Cross-Agent Handoffs](CROSS_AGENT_HANDOFFS.md) for the tracked/ignored
handoff boundary and [Local Provider Credentials](LOCAL_PROVIDER_CREDENTIALS.md)
for credential handling.

## Governance Before Action

Use the narrowest relevant check before implementation:

```bash
autoforge doctrine
autoforge constitution list
autoforge constitution check "<objective>"
autoforge domain check
autoforge context --explain
```

Constitution rules express project-approved requirements and prohibitions.
Doctrines provide standing guidance. Domain concepts preserve entities,
relationships, and invariant evidence. Active work scope and the generated
agent contract define which files and actions are allowed for the current
session.

Unknown evidence is not approval. If an invariant, design relationship,
context packet, or validation result is stale or unavailable, investigate or
request direction rather than silently treating it as satisfied.

## Decision and Evidence Loop

```bash
autoforge learning evidence add --kind <kind> --summary "..." --source "..." --work <work-id>
autoforge decide --statement "..." --reasoning "..." --consequence "..." --scope <scope> --keyword <keyword> --work <work-id> --evidence <evidence-id>
autoforge why --work <work-id>
```

Use decisions for durable rationale, not activity logs. Supersede a decision
when the project changes direction so history remains explainable. Use learning
hypotheses and experiments when a product choice is a measurable bet rather
than a settled fact.

## Session Boundaries

At session start:

1. Run `doctor` and `recap`.
2. Read applicable repository instructions.
3. Resolve `context --explain` when work is active.
4. Confirm scope, governance, risks, and validation.

During work, refresh context after material state changes and record durable
knowledge in its appropriate domain. Before completion, run the quality gate,
link a decision to the active work, and use `done`. Before switching agents,
write a structured handoff with one explicit next action.

## Global and Project Memory

The global workspace knows which AutoForge projects exist on the current
machine and supports relocation, lifecycle, retention, and portable global
storage operations. Project truth remains scoped to each repository; an agent
must not import assumptions from another project merely because both appear in
`autoforge projects list`.

Use `autoforge attach "$PWD"` for a persistent project. Use `autoforge init`
only when intentionally creating local-only state that should not enter the
global registry.
