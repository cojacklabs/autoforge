# v0.15 Governance Foundation Audit

## Scope

This audit covers the v0.15 Project Constitution and Governance foundation:

- typed constitution, rule, scope, evaluation, and conflict contracts;
- persistence under `.autoforge/governance/constitution.json`;
- deterministic rule selection and evaluation;
- context-packet governance rendering;
- agent-contract governance directives; and
- the `constitution` CLI workflow.

## Implemented

- `src/governance/schemas.ts` defines versionable governance artifacts and enforcement levels.
- `src/governance/store.ts` persists and validates constitution artifacts.
- `src/governance/evaluate.ts` selects scoped rules and reports pass, warning, conflict, blocked, or not-applicable outcomes.
- Context packets expose applicable governance evaluations without changing existing packet fields.
- Agent directives translate evaluations into required and prohibited actions.
- `autoforge constitution init|list|show|check` provides a project-facing governance workflow.

## Evidence

Focused governance tests cover schemas, persistence, evaluation, context delivery, agent directives, and CLI behavior. TypeScript compilation, Prettier, and the active-file AutoForge guardrail pass for the implementation.

## Remaining Follow-up

- Run the complete foundation and legacy suites before the v0.15 release checkpoint.
- Add release notes and migration guidance when the v0.15 version is cut.
- Revisit richer rule authoring and interactive conflict resolution in later roadmap phases; v0.15 intentionally keeps the CLI deterministic and non-interactive.

## Audit Decision

The v0.15 governance foundation is implementation-complete for the current roadmap boundary and is ready for broader validation. No release or remote publication is authorized by this audit.
