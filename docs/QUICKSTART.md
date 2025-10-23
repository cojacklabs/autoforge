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

Set working dir to ./autoforge.
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

## 7. Snapshot the Project (Optional)

To create `REPOMIX.md` for the host project:

```bash
npm run repomix -- ..  # run from ./autoforge
```

This generates a flattened context summary in the parent directory so AI tools see the whole repository.
