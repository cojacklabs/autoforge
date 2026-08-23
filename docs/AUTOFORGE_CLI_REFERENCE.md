# AutoForge CLI Reference

## Project Targeting

```bash
autoforge doctor
autoforge --project "$PWD" doctor
autoforge use <project-name> doctor
```

Use `use` when operating on a named project from outside its directory.

## Lifecycle

```bash
autoforge init
autoforge doctor
autoforge add task --phase <phase-id> --name "Task" --description "..." --include "src/**"
autoforge start task <task-id>
autoforge context --explain
autoforge check --path src/file.ts
autoforge gate check
autoforge done
autoforge recap
```

## Memory and Planning

```bash
autoforge decide --statement "..." --reasoning "..." --consequence "..." --scope project --keyword architecture
autoforge why --query "..."
autoforge doctrine
autoforge changelog compile [--since <git-tag>]
autoforge intent assess <json-file> --kind implementation
autoforge intent register <json-file>
autoforge research register <json-file>
autoforge knowledge list
autoforge planning list --source <intent.json>
autoforge planning handoff <kind> --phase <phase-id> --include "docs/**"
```

## Strategy and Prioritization

```bash
autoforge strategy assess <work-id> --alignment <low|medium|high|uncertain> --value <low|medium|high|uncertain> --risk <low|medium|high|uncertain> --cost <low|medium|high|uncertain> --evidence-strength <low|medium|high|uncertain> --dependency-pressure <low|medium|high|uncertain> --complexity <low|medium|high|uncertain> --release-constraint <low|medium|high|uncertain> --decision <now|next|later|backlog> --rationale <text> [--evidence <evidence-id>] [--supersedes <strategy-id>]
autoforge strategy list [--decision <now|next|later|backlog>] [--work <work-id>]
autoforge strategy show <id>
autoforge strategy history <work-id>
```

`strategy assess` records an explainable, multi-factor judgment on any
feature, phase, task, or issue — no blended numeric score, only
categorical factors and a human-assigned `now`/`next`/`later`/`backlog`
decision label. Every assessment writes a linked decision record via
`autoforge decide`'s underlying service, so `autoforge why` also
surfaces strategy calls. `strategy assess` is independent from
`autoforge orchestrate prioritize`, which remains a narrow 0-100
scheduling tiebreaker for work already inside an active orchestration
plan.

## Learning and Evidence

```bash
autoforge learning hypothesis add --statement <text> --expected-outcome <text> --metric <text> --target <text> [--work <work-id>]
autoforge learning hypothesis list [--status <proposed|testing|confirmed|refuted>]
autoforge learning hypothesis show <id>
autoforge learning hypothesis status <id> --status <proposed|testing|confirmed|refuted>
autoforge learning experiment add --hypothesis <id> [--hypothesis <id> ...] --method <text>
autoforge learning experiment list [--status <planned|running|completed|abandoned>]
autoforge learning experiment show <id>
autoforge learning experiment complete <id>
autoforge learning evidence add --kind <kind> --summary <text> --source <text> [--experiment <id>] [--hypothesis <id>] [--work <work-id>]
autoforge learning evidence list [--kind <kind>]
autoforge learning evidence show <id>
autoforge decide --evidence <evidence-id> ...
```

`learning hypothesis` records a testable belief with a free-text `--metric`
and `--target`. `learning experiment` may test multiple hypotheses at once
via repeated `--hypothesis` flags. `learning evidence` accepts nine kinds
(`analytics`, `beta-feedback`, `support-ticket`, `bug-report`,
`usability-study`, `experiment-result`, `performance-metric`, `interview`,
`ai-evaluation`) and links to an experiment, a hypothesis, and/or a work item
simultaneously — the links are not mutually exclusive. Passing `--evidence
<id>` to `autoforge decide` closes the loop: it stamps that decision back
onto every referenced evidence record.

## Governance and Domain Intelligence

```bash
autoforge constitution init
autoforge constitution list
autoforge constitution show <rule-id>
autoforge constitution check "<objective>"
autoforge domain init
autoforge domain list
autoforge domain show <concept-id>
autoforge domain check
```

Domain checks preserve unknown invariant evidence instead of treating it as verified.

## Agent Contracts

```bash
autoforge agents list
autoforge contract generate <agent-id>
autoforge contract show
autoforge contract validate
```

Canonical agent IDs are `codex`, `claude`, `cursor`, `gemini`, `grok`, and `generic`. `antigravity` and `agy` normalize to `gemini`.

## Design and Workflows

```bash
autoforge design validate <file>
autoforge design import <file>
autoforge design update <file>
autoforge design list
autoforge design search <query>
autoforge design check [--json]
autoforge design show <id>
autoforge workflow start <id> <kind>
autoforge workflow list
autoforge workflow show <id>
autoforge workflow advance <id> [--skip-optional]
autoforge workflow handoff <json-file>
autoforge workflow handoff --schema
```

Intent aliases are accepted by `workflow start`: `architecture` maps to
`architecture-change`, `design` to `design-create`, and `implementation` or
`planning` to `feature-development`. Invalid values print every canonical kind
and supported alias.

## Multi-Agent Orchestration

```bash
autoforge orchestrate plan [json-file]
autoforge orchestrate status
autoforge orchestrate ready
autoforge orchestrate claim <work-id> --agent <id> [--role <role>] [--read-only] [--ttl <minutes>]
autoforge orchestrate handoff <assignment-id> <json-file>
autoforge orchestrate release <assignment-id>
autoforge orchestrate approve <gate-id> [--by <actor>]
autoforge orchestrate prioritize <work-id> <0-100>
autoforge orchestrate explain <work-id>
```

`plan` imports an explicit dependency graph when a JSON file is supplied. With
no file, it compiles the current incomplete AutoForge tasks and issues into a
default implementation queue. `ready` is deterministically ordered by human
pinning, release impact, downstream unlocks, risk, explicit priority, and age.

Write claims receive exclusive scope leases and isolated Git worktrees.
Read-only claims do not block writers. Assignment packets and handoffs persist
under `.autoforge/orchestration/` and are generated runtime state rather than
source documentation.

Claims require a matching canonical task or issue. Their assignment packets
contain role-aware, budgeted context plus selection reasons and a source
fingerprint. `orchestrate explain` returns `contextFreshness` as `fresh`,
`stale`, or `unavailable` for active assignments.

Applicable constitution rules are embedded in canonical context. Required and
prohibited actions derive from governance plus the selected agent contract, and
validation requirements derive from configured project quality gates.

## Global Workspace

```bash
autoforge projects list [--json]
autoforge projects list --json
autoforge projects show <path|project_name> [--json]
autoforge projects relocate <path|project_name> <new-path> [--planned]
autoforge projects move <path|project_name> <new-path> [--planned]
autoforge projects storage <path> [--json]
autoforge projects global-storage <path> [--json]
autoforge projects global-export <path> [--json]
autoforge projects global-import <path> <bundle> [--json]
autoforge projects archive <path>
autoforge projects restore <path>
autoforge projects update <path> [--name <name>] [--alias <alias>] [--lifecycle <state>] [--retention-days <n>]
autoforge projects register <path>
autoforge projects prune [--dry-run]
autoforge attach <path>
autoforge detach <path>
autoforge assets list templates
autoforge assets list doctrines
```

`relocate` updates a registered project's canonical path after the directory has
been moved and migrates path-derived global storage. The destination must be an
initialized AutoForge project with the same project identity. Use `--planned`
before moving the directory to record the intended destination without changing
the active registry path. `move` is an alias for `relocate`.

## Bootstrap, Migration, and Updates

```bash
autoforge bootstrap inspect
autoforge bootstrap status
autoforge bootstrap scaffold
autoforge bootstrap approve <artifact-id> [--evidence <path|workflow-id>]
autoforge migrate --dry-run
autoforge update
autoforge trace add <source> <relationship> <target>
autoforge trace list
autoforge trace check
autoforge trace impact <artifact> [--depth <n>] [--direction <forward|reverse|both>]
autoforge evidence list [--json]
autoforge evidence summary [--json]
autoforge twin generate [--json]
autoforge twin show [--json]
autoforge twin query [--type <type>] [--relationship <name>] [--depth <n>] [--limit <n>] [--json]
autoforge update
autoforge version
```

Bootstrap approvals update `.autoforge/bootstrap/manifest.json` atomically and
record approval time and evidence. Completed workflow IDs are accepted as
evidence; active workflow runs are rejected.

The digital twin includes governance, domain, design, strategy, and
traceability data alongside work, decisions, and evidence — `twin query
--type constitution`, `--type domain`, `--type strategy`, `--type
validation-evidence`, and `--type trace-link` are all queryable once the
corresponding domain has data.

## JSON Input Schemas

```bash
autoforge schemas list
autoforge schemas show <id>
autoforge bootstrap discover --schema
autoforge intent assess --schema
autoforge research register --schema
autoforge workflow handoff --schema
autoforge orchestrate plan --schema
autoforge orchestrate handoff --schema
```

Schema output uses JSON Schema Draft 2020-12 generated from the same Zod
contracts that validate runtime input.

The command installs the exact version returned by npm and uses `--global` for global installations. Verify with `autoforge version` and `autoforge doctor`.

## Help and TUI

```bash
autoforge help
autoforge tui
autoforge tui --snapshot --no-color
```

Legacy commands not shown by `autoforge help` are not part of the supported workflow.
