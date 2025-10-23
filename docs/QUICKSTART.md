# AutoForge Quickstart

Use AutoForge as a subfolder in your project to orchestrate multi‑agent SDLC via Chat Mode.

## 1) Embed AutoForge

```bash
cd /path/to/your-project
git clone https://github.com/cojacklabs/autoforge.git autoforge
cd autoforge
npm install
```

## 2) Configure

- Edit `ai/code_targets.yaml` to point at your backend, frontend, and tests directories.
- (Optional) Edit `ai/context_targets.yaml` if your PRD/blueprints/UI/UX live outside the defaults.

## 3) Validate

```bash
npm run validate
```

## 4) Kickoff (Chat Mode)

Paste this into your coding AI:

```
Read and follow:
- autoforge/ai/context.manifest.yaml
- autoforge/ai/agents.yaml
- autoforge/ai/prompts/kickoff.yaml

Set working dir to ./autoforge. List manifest entrypoints, confirm quality gates, and then run the kickoff sequence (PM → UI/UX → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective). Log outputs to autoforge/ai/logs/** and autoforge/ai/reports/**.
```

## 5) Change Requests

- Create a file under `change_requests/` (use the example template) and push.
- Follow the Action’s summary to run the change request → impact analysis chain in Chat Mode.

## 6) Generate Context Snapshot

```bash
npm run repomix -- ..   # from ./autoforge to summarize the parent project
```

This produces a `REPOMIX.md` at your project root for sharing with AI tools.
