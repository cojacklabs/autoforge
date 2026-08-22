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

## Handling Unstructured Prompts

Do not immediately translate a long prompt into code. First:

1. Preserve the user's raw intent.
2. Extract the objective, requirements, assumptions, unknowns, constraints, and acceptance criteria.
3. Run `autoforge --project "$PWD" intent assess <intent.json> --kind <work-kind>`.
4. Follow the recommended workflow stages.
5. Create or update research, design, planning, and work artifacts as needed.
6. Resolve context before editing files.
7. Respect the active contract, scope, prohibited actions, and validation requirements.
8. Persist durable decisions and stage handoffs before completion.

## Initialization

For a new project, run `autoforge --project "$PWD" init` only when `.autoforge/`
does not already exist. Then generate and validate the contract:

```bash
autoforge --project "$PWD" contract generate <agent-id>
autoforge --project "$PWD" contract validate
```

Never delete or replace existing `.autoforge/` state without explicit approval.

## Remote and Local Documentation

The canonical documentation is available in the repository GitHub source and
the installed package. After initialization, the project-local `.autoforge/`
state is authoritative for that project's work, decisions, contracts,
workflows, and context. Do not substitute global or unrelated project memory.
