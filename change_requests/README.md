# Change Requests

Drop structured YAML files into this folder to trigger the change-management workflow.
Most of the time you can run `Execute .autoforge/ai/prompts/change_intake.yaml` and let the Product Manager agent create the file for you.

- The agent clones `CR-0000_example.yaml`, increments the ID, and fills in the details from your conversation.
- If you prefer to work offline, copy `CR-0000_example.yaml` manually and update the metadata yourself.
- Each file should describe the change, impacted areas, acceptance criteria, rollback plan, and dependencies.

Once committed, the change-request workflow validates context and instructs you (via Chat Mode) to run the change request, UI/UX, and impact-analysis prompts.

## Workflow tips

- Keep the assistant in `./autoforge` while you draft and review the YAML so planning artifacts stay scoped.
- When the engineer agent picks up the change, it should use the paths defined in `autoforge.config.json` (mirrored to `ai/code_targets.yaml`) for code/test edits and return here to log outcomes.
- Correct misunderstandings by editing the request file or replying with clarifications—the approval flow treats the YAML as the source of truth.
- Update the project memory file (`ai/memory/*.yaml`) with approved decisions, blocked items, and next actions before closing the request.
- Require commits to follow `docs/ai/COMMIT_PLAYBOOK.md`, including referencing the change request id in the message body.
- Decide on the semantic version bump (major/minor/patch) and update manifests accordingly before the final commit.
