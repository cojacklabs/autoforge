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
```

## Global Workspace

```bash
autoforge projects list
autoforge projects register <path>
autoforge projects prune
autoforge attach <path>
autoforge detach <path>
autoforge assets list templates
autoforge assets list doctrines
```

## Bootstrap, Migration, and Updates

```bash
autoforge bootstrap inspect
autoforge bootstrap status
autoforge bootstrap scaffold
autoforge migrate --dry-run
autoforge update
autoforge update
autoforge version
```

The command installs the exact version returned by npm and uses `--global` for global installations. Verify with `autoforge version` and `autoforge doctor`.

## Help and TUI

```bash
autoforge help
autoforge tui
autoforge tui --snapshot --no-color
```

Legacy commands not shown by `autoforge help` are not part of the supported v0.16 workflow.
