# Change Requests

Drop structured YAML files into this folder to trigger the change-management workflow.

- Use `CR-0000_example.yaml` as a template for new requests.
- Each file should describe the change, impacted areas, acceptance criteria, rollback plan, and dependencies.

Once committed, the change-request workflow validates context and instructs you (via Chat Mode) to run the change request, UI/UX, and impact-analysis prompts.

## Workflow tips

- Keep the assistant in `./autoforge` while you draft and review the YAML so planning artifacts stay scoped.
- When the engineer agent picks up the change, it should use the paths in `ai/code_targets.yaml` for code/test edits and return here to log outcomes.
- Correct misunderstandings by editing the request file or replying with clarifications—the approval flow treats the YAML as the source of truth.
