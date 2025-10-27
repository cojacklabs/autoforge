# Commit & Command Playbook

Use this checklist whenever an agent is about to commit code, run automated tooling, or apply migrations. The goal is to make every change auditable, reproducible, and aligned with the human’s expectations.

## Before you commit

1. **Sync memory** – Review the active file in `ai/memory/` to confirm open tasks and risk notes.
2. **Stage consciously** – Stage only files that belong to the current change request or bug fix. Leave planning artifacts (`ai/logs/**`, `ai/reports/**`) uncommitted unless the workflow explicitly asks for them.
3. **Verify tests/linters** – Run only the commands required to validate the slice. Document which commands ran, their exit codes, and any artifacts produced.
4. **Summarise in the log** – Update the current change request or memory entry with a short recap of what changed, tests executed, and known gaps.

## Commit message rules

- **Format** – `type(scope): short imperative summary`
  - `type`: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `hotfix`
  - `scope`: folder or capability (e.g., `backend`, `ui`, `qa`)
  - Example: `fix(backend): handle missing customer billing id`
- **Body expectations**
  - Reference the change request, idea, or defect id that drove the work.
  - List user-facing effects or API changes.
  - Mention tests or scripts executed (e.g., `npm test -- ...`).
  - Capture follow-up tasks if the fix is partial.
- **One logical change per commit.** If the scope expands, split the work into separate commits or request human approval to squash.

## Command execution protocol

1. **Declare intent** – State the command, why it is needed, and expected outputs before running anything that mutates state (installs, migrations, formatters).
2. **Use explicit working directories** – Planning commands run from `./autoforge`; code/test commands run in the directories defined in `autoforge.config.json` (mirrored to `ai/code_targets.yaml`).
3. **Capture results** – Summarise command output in the log; save large logs under `ai/logs/**` rather than pasting into chat.
4. **Rollback plan** – If the command fails or produces unexpected artifacts, describe how to undo the change or request human guidance.

## Versioning diligence

Before the first commit in a change sequence:

1. Inspect `package.json` (or the relevant manifest) and determine whether the work warrants a **major**, **minor**, or **patch** bump:
   - **major** – breaking API change, incompatible configuration, or migration that requires manual action.
   - **minor** – backwards-compatible feature, new endpoint, or UX addition.
   - **patch** – bug fix, dependency upgrade with no feature change, copy tweak.
2. Update the version number following semantic versioning and stage the manifest alongside any generated lockfiles.
3. Record the reasoning for the bump in the commit body (e.g., “Minor bump to 1.4.0 for dashboard filter feature”).
4. If no bump is required (documentation-only change), explicitly state that rationale in the memory file and commit message.

## Bug fixes vs. change requests

- **Change requests** – Follow `change_requests/README.md` and link commits to the request id (`CR-####`). Use the main kickoff or role-specific prompts.
- **Hotfix / bug fix** – For urgent defects, run `ai/prompts/hotfix.yaml`. It keeps scope tight, requires repro steps, and hands off to `fullstack_engineer`.
  - Commits from hotfixes should use the `hotfix` or `fix` type and include incident metadata in the body.
  - After the fix, update the memory file and schedule a retrospective run if the incident warrants one.

## Human approvals

- Pause if a command needs elevated privileges, impacts environments beyond local development, or modifies files outside declared targets.
- Always summarise the planned commit before executing `git commit` so the human can veto or request edits.
- If multiple agents collaborate on the same slice, the Mastermind or coordinator is responsible for ensuring commit history stays clean and matches the documented plan.

By following this playbook, assistants remain transparent, predictable teammates and make handoffs between humans and AI frictionless.
