# Idea Stage

Capture raw product ideas and initial prompts here.

- Use `IDEA_TEMPLATE.yaml` to define the problem, goals, and success metrics.
- Once an idea is documented, run the idea intake prompt to create a research plan.
- Store follow-up outputs in `../research/plans/` and `../research/briefs/`.

This folder anchors the starting point (Brainstorm) of the AutoForge SDLC pipeline.

## Prompt

- `autoforge/ai/prompts/discovery_researcher.yaml`
- `autoforge/ai/prompts/idea_intake.yaml`

## Collaboration tips

- Discuss ideas with the assistant from inside `./autoforge` so interviews, notes, and drafts land in `ideas/` and `ai/logs/research/`.
- If the agent misinterprets the vision, update the idea file directly or provide inline corrections—subsequent prompts will treat the edited YAML as canonical.
- Before handing off to architecture or engineering, skim the captured logs to make sure the story reflects what you want built; adjust here before the downstream prompts begin.
- Summarize the final direction in the active memory file (`ai/memory/*.yaml`) so later sessions or different tools inherit the same context.
