# AutoForge Agent Setup Guide

## Canonical Startup Prompt

> Set up and use AutoForge for this repository: review `AGENTS.md` and the AutoForge agent guidance, run `npx --no-install autoforge doctor`, initialize only if this project is not already initialized, then inspect `npx --no-install autoforge context --explain`; summarize the detected project structure, active work, governing rules, and validation steps before making changes.

## Required Procedure

1. Confirm the repository root and inspect existing `AGENTS.md` instructions.
2. Run `npx --no-install autoforge doctor`.
3. Run `npx --no-install autoforge init` only when `.autoforge/` is absent.
4. Inspect active work with `npx --no-install autoforge recap`.
5. Resolve context with `npx --no-install autoforge context --explain`.
6. Ask for confirmation when initialization would overwrite or migrate existing project state.

Agents must not silently replace existing configuration, delete project memory, or broaden file scope during setup.
