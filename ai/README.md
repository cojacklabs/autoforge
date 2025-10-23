# AI Directory

This folder defines AutoForge’s multi-agent workflow.

- `context.manifest.yaml` – Maps repository context and quality gates.
- `agents.yaml` – Declares roles (Product Manager, UI/UX Designer, Architect, etc.).
- `prompts/` – YAML prompts for each agent.
- `code_targets.yaml` – Host project locations for generated code/tests.
- `context_targets.yaml` – Optional overrides for documentation paths.
- `logs/` – Output from agent executions.
- `reports/` – Summaries (kickoff, change requests, retrospectives, UI/UX updates).

Before running prompts:

1. Update `code_targets.yaml` to match your project layout.
2. Update `context_targets.yaml` if documentation lives outside AutoForge’s defaults.
3. Operate from this directory when executing prompts (e.g., set working dir to `./autoforge`).
