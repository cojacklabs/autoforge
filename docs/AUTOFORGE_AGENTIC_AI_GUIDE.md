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

For a new project, run `autoforge --project "$PWD" init` only when `.autoforge/`
does not already exist. Then generate and validate the contract:

```bash
autoforge --project "$PWD" contract generate <agent-id>
autoforge --project "$PWD" contract validate
```

Never delete or replace existing `.autoforge/` state without explicit approval.

## Bootstrap Production and Approval

Treat the bootstrap manifest as the readiness index, not the artifact authoring
tool. Use `intent`, `workflow`, `planning`, `design`, and `research` to produce
the backing work, then run `autoforge bootstrap approve <artifact-id>
--evidence <path|workflow-id>` to connect validated evidence to the manifest.
Never edit `manifest.json` manually.

Before creating any JSON input, run `autoforge schemas list` and inspect the
relevant contract with `autoforge schemas show <id>` or the command's
`--schema` flag.

## Remote and Local Documentation

The canonical documentation is available in the repository GitHub source and
the installed package. After initialization, the project-local `.autoforge/`
state is authoritative for that project's work, decisions, contracts,
workflows, and context. Do not substitute global or unrelated project memory.
