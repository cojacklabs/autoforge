# AI Operating Playbooks

This folder preserves companion playbooks for repository-aware coding agents.
The current onboarding authority is:

1. applicable repository `AGENTS.md` instructions;
2. [`docs/AUTOFORGE_AGENT_SETUP_GUIDE.md`](../AUTOFORGE_AGENT_SETUP_GUIDE.md);
3. [`docs/AUTOFORGE_AGENTIC_AI_GUIDE.md`](../AUTOFORGE_AGENTIC_AI_GUIDE.md);
4. the installed `autoforge help`, runtime schemas, and
   `.autoforge/agent-contract.json`.

Older files in this directory may refer to removed `load`, `configure`, managed
YAML, or prompt-chain commands. Those references are historical and must not be
executed against v0.25 without first confirming an equivalent command in the
[current CLI reference](../AUTOFORGE_CLI_REFERENCE.md).

## Current v0.25 Session Pattern

```bash
autoforge version
autoforge --project "$PWD" doctor
autoforge --project "$PWD" recap
autoforge --project "$PWD" bootstrap status
autoforge --project "$PWD" context --explain # only when work is active
autoforge --project "$PWD" contract validate
```

Use `autoforge attach "$PWD"` when persistent project state is absent. Keep
scope, decisions, evidence, validation, and handoffs in canonical AutoForge
state; do not use the raw chat transcript as the project memory layer.

## Preserved Playbooks

- `AGENT_AUTONOMY_GUIDE.md` — historical autonomy and working-directory rules.
- `AGENT_KICKOFF_INSTRUCTIONS.md` — historical prompt-chain kickoff guidance.
- `CHANGE_MANAGEMENT_GUIDE.md` — historical change-request workflow.
- `COMMIT_PLAYBOOK.md` — commit-organization guidance; confirm commands against
  current repository policy.
- `LEARNING_EVENTS.md` — learning-event concepts; prefer current `learning`
  commands and schemas.

These documents remain useful design context, but current CLI behavior and the
active AutoForge contract take precedence when they conflict.
