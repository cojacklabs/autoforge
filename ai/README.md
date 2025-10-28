# AI Directory

This folder defines AutoForge’s multi-agent workflow.

- `context.manifest.yaml` – Maps repository context and quality gates.
- `agents.yaml` – Declares roles (Product Manager, UI/UX Designer, Architect, etc.).
- `prompts/` – YAML prompts for each agent.
- `code_targets.yaml` – Managed file generated from autoforge.config.json (code locations for generated artifacts).
- `context_targets.yaml` – Managed file generated from autoforge.config.json (documentation overrides).
- `logs/` – Output from agent executions.
- `reports/` – Summaries (kickoff, change requests, retrospectives, UI/UX updates).

Before running prompts:

1. Update `autoforge.config.json` (codeTargets/contextTargets) to match your project layout.
2. Run `npx autoforge configure` so the managed `ai/code_targets.yaml` and `ai/context_targets.yaml` stay in sync.
3. (First time or after upgrade) Run `npx autoforge load` and paste the generated prompt into your coding AI to reload rules, roles, `ai/AGENTS.md`, and memory.
4. Operate from this directory when executing prompts (e.g., set working dir to `.autoforge/`).

## Applying configuration

Whenever you change `autoforge.config.json`, reapply it:

```bash
npx autoforge configure
```

This regenerates the managed YAML files and ensures every agent sees the latest project directories and documentation paths. Avoid editing files under `.autoforge/ai/` directly—those are overwritten by the configure command.
