# AutoForge Agent Setup Guide

## Canonical Startup Prompt

> Use the globally installed AutoForge CLI for this repository: run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`; if `.autoforge/` is absent, run `autoforge attach "$PWD"` to initialize the project and register it in the global workspace in one step (`autoforge init` alone only creates local `.autoforge/` state — it does not register the project, so it will not appear in `autoforge projects list`; use plain `init` only when you deliberately want a local-only install with no global registry entry); refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; read `docs/AUTOFORGE_CLI_REFERENCE.md` for the complete current command surface so you can govern, scaffold, categorize, organize, prioritize, and reorganize this project's work using the full AutoForge CLI; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.

## Required Procedure

1. Confirm the repository root and inspect existing `AGENTS.md` instructions.
2. Run `autoforge --project "$PWD" doctor` and confirm the global version.
3. Run `autoforge --project "$PWD" attach "$PWD"` when `.autoforge/` is absent — this initializes the project and registers it in the global workspace in one step. Use plain `autoforge --project "$PWD" init` only for a deliberately local-only install (e.g. a disposable CI container) that should not appear in `autoforge projects list`.
4. Inspect active work with `autoforge --project "$PWD" recap`.
5. Resolve context with `autoforge --project "$PWD" context --explain` when active work exists.
6. Generate the compatible agent contract with `autoforge --project "$PWD" contract generate <agent-id>`.
7. Validate it with `autoforge --project "$PWD" contract validate`.
8. Ask for confirmation when initialization would overwrite or migrate existing project state.

Agents must not silently replace existing configuration, delete project memory, or broaden file scope during setup.
