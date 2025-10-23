# AutoForge Quickstart (Embedded Mode)

Follow these steps to run AutoForge inside an existing project using Chat Mode.

## 1. Clone & Install

```bash
cd /path/to/your-project
git clone https://github.com/<your-org>/autoforge.git autoforge
cd autoforge
npm install
```

## 2. Configure Paths

- Edit `ai/code_targets.yaml` to point at your backend, frontend, and tests directories.
- (Optional) edit `ai/context_targets.yaml` if your PRD/blueprint/UI/UX docs live outside the defaults.

## 3. Capture the Idea

Either fill `ideas/IDEA_TEMPLATE.yaml` manually or run this in Chat Mode:

```
Execute autoforge/ai/prompts/discovery_researcher.yaml
Help me capture the vision for this project.
```

The agent will interview you and save the idea under `ideas/` plus a summary in `ai/logs/`.

### Seed shared memory

- Copy `ai/memory/MEMORY_TEMPLATE.yaml` to `ai/memory/MEMORY_active.yaml` (or another descriptive name).
- Capture the latest decisions, corrections, and open questions after each working session.
- When you start a new Chat Mode run—or swap to a different coding agent—tell it to review the active memory file before continuing the work.

## 4. Validate Quality Gates

```bash
npm run validate
```

## 5. Kick Off (Chat Mode)

Paste the block below into your coding assistant:

```
Read and follow:
- autoforge/ai/context.manifest.yaml
- autoforge/ai/agents.yaml
- autoforge/ai/prompts/kickoff.yaml

While planning, stay inside ./autoforge for docs/logs.
When writing code/tests, use paths from autoforge/ai/code_targets.yaml.
Confirm the latest idea in ideas/.
Run the kickoff sequence (PM → UI/UX → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective).
Log outputs to autoforge/ai/logs/** and autoforge/ai/reports/**.
```

## 6. Change Requests

When you have a new feature/bugfix:

```bash
cp change_requests/CR-0000_example.yaml change_requests/CR-0001_myfeature.yaml
```

Fill in summary, acceptance criteria, rollback plan. Commit/push and follow the Chat Mode instructions posted by the GitHub Action.

> Guidance for humans & agents
>
> - Capturing ideas, refining change requests, and logging updates all happen inside `./autoforge`.
> - Keep the shared memory file in `ai/memory/` up to date; new agents should review it before acting.
> - Engineering prompts step out only through the directories listed in `ai/code_targets.yaml`—update that file before coding.
> - Agents should announce package installs, migrations, or debugging commands in advance so you can approve or redirect them.
> - Follow `docs/ai/COMMIT_PLAYBOOK.md` when staging commits or running impactful commands.
> - Confirm semantic version bumps in package manifests before the final commit; document the rationale in the commit body.

For single-issue bug fixes that cannot wait for the full change-request workflow, run `Execute autoforge/ai/prompts/hotfix.yaml` and follow the same memory/commit rules.

## 7. Snapshot the Project (Optional)

To create `REPOMIX.md` for the host project:

```bash
npm run repomix -- ..  # run from ./autoforge
```

This generates a flattened context summary in the parent directory so AI tools see the whole repository.

## 8. Update AutoForge

When new framework updates land upstream, run:

```bash
npm run update
```

The updater fetches from `origin`, fast-forwards your current branch, reinstalls dependencies, and runs `npm run validate`. Ensure both directories are clean before executing it:
- `autoforge/` itself (the nested repo)
- your host project repo (the parent directory where AutoForge lives)

Commit or stash changes in both locations so local edits are not overwritten.
