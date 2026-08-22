# AutoForge Agent Setup Guide

## Canonical Startup Prompt

> Use the globally installed AutoForge CLI for this repository: run `autoforge version`, `autoforge --project "$PWD" doctor`, and `autoforge --project "$PWD" bootstrap status`; review `AGENTS.md` when present and inspect `.autoforge/`, initialize or attach the project only when needed, refresh your understanding after AutoForge updates, and when active work exists run `autoforge --project "$PWD" context --explain`; summarize the project structure, active work, governance rules, relevant decisions, and validation requirements before making changes.

## Required Procedure

1. Confirm the repository root and inspect existing `AGENTS.md` instructions.
2. Run `autoforge --project "$PWD" doctor` and confirm the global version.
3. Run `autoforge --project "$PWD" init` only when `.autoforge/` is absent, or attach/register the project when using global workspace mode.
4. Inspect active work with `autoforge --project "$PWD" recap`.
5. Resolve context with `autoforge --project "$PWD" context --explain` when active work exists.
6. Generate the compatible agent contract with `autoforge --project "$PWD" contract generate <agent-id>`.
7. Validate it with `autoforge --project "$PWD" contract validate`.
8. Ask for confirmation when initialization would overwrite or migrate existing project state.

Agents must not silently replace existing configuration, delete project memory, or broaden file scope during setup.
