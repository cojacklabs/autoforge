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
autoforge intent assess <json-file> --kind implementation
autoforge intent register <json-file>
autoforge research register <json-file>
autoforge knowledge list
autoforge planning list --source <intent.json>
autoforge planning handoff <kind> --phase <phase-id> --include "docs/**"
```

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

Legacy commands not shown by `autoforge help` are not part of the supported v0.16 workflow.
