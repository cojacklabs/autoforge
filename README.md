# 🧠 AutoForge — Embedded Multi-Agent SDLC

AutoForge lives as `./autoforge/` inside your existing project so coding assistants can plan, design, and ship software autonomously. Planning artifacts stay inside `autoforge/`, while application code and tests write to your project paths (configured via `ai/code_targets.yaml`).

> 📘 Short on time? See [docs/QUICKSTART.md](docs/QUICKSTART.md). Need prompt examples? See [docs/prompt_handbook.md](docs/prompt_handbook.md).

---

## 1. Clone AutoForge into your project

```bash
cd /path/to/your-project
git clone https://github.com/cojacklabs/autoforge.git autoforge
cd autoforge
npm install
```

---

## 2. Configure paths once

- Edit `ai/code_targets.yaml` so `backend`, `frontend`, and `tests` point to real directories in your project (defaults assume `../src/backend`, `../src/frontend`, `../tests`).
- (Optional) Edit `ai/context_targets.yaml` if your documentation (PRD/blueprint/UI/UX) lives outside the defaults.

You’ve now told the agents where planning docs live and where to generate code.

---

## 3. Capture the idea (human ↔️ AI conversation)

AutoForge expects at least one idea file before kickoff.

- Copy `ideas/IDEA_TEMPLATE.yaml`, fill in the project vision, and save (e.g., `ideas/IDEA-0001_alpha.yaml`). **OR**
- Let the assistant interview you:
  ```
  Execute autoforge/ai/prompts/discovery_researcher.yaml
  Help me capture the project idea by asking clarifying questions.
  ```
  The agent writes the filled template plus notes under `ai/logs/research/`.

Continue iterating with the assistant until the idea reflects what you want built.
Record the most important decisions or clarifications in `ai/memory/` so future sessions inherit the same story.

---

## 4. Validate quality gates

```bash
npm run validate
```

This enforces everything in `ai/context.manifest.yaml` (PRD present, diagrams exist, security checklist ready, observability docs, etc.). If something is missing, fix it before moving on.

---

### Workspace boundaries & approvals

- Planning/logging: keep your assistant in `./autoforge` so ideas, research, and reports stay contained.
- Implementation: agents may only touch the host project through the paths declared in `ai/code_targets.yaml` (update them first to match your repo).
- Elevated actions (package installs, long-running scripts, migrations) should be called out explicitly so the human reviewer can approve before execution.

---

### Guiding your AI teammate

- Kick off every session by pointing the agent at the latest `ideas/IDEA_*.yaml` entry and clarifying the goal in your own words.
- If the agent drifts or makes wrong assumptions, edit the relevant docs (idea, PRD, tech blueprint) or reply with corrections—AutoForge treats those files as the single source of truth.
- Remind the agent to log discoveries under `ai/logs/**` and summaries under `ai/reports/**` so you can audit each step.
- Use change requests when the scope shifts; the prompts walk the agent through impact analysis and give you checkpoints to accept or redirect work.
- Expect the agent to ask before running package installs, migrations, or touching files outside the declared targets—approve or deny explicitly to keep control of your repo.
- Keep an active memory file under `ai/memory/` up to date after each session; direct new assistants to review it before continuing work.
- Before staging commits or running stateful commands, have the agent review `docs/ai/COMMIT_PLAYBOOK.md` so history stays clean and reproducible.

---

## 5. Kick off with your coding AI

Paste the snippet below into your coding assistant (Codex, Claude Code, Gemini Code, Cursor, etc.). This sets the stage for multi-agent handoffs.

```
Read and follow:
- autoforge/ai/context.manifest.yaml
- autoforge/ai/agents.yaml
- autoforge/ai/prompts/kickoff.yaml

While planning: stay inside ./autoforge for docs/logs.
When writing code/tests: use paths from autoforge/ai/code_targets.yaml.
Confirm the latest idea in ideas/.
Run the kickoff sequence (Product Manager → UI/UX → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective).
Log outputs to autoforge/ai/logs/** and autoforge/ai/reports/**.
```

### Follow-up prompts

After kickoff completes you can continue agent-by-agent:

- `Execute autoforge/ai/prompts/architect.yaml`
- `Execute autoforge/ai/prompts/fullstack_engineer.yaml`
- … and so on down the chain.

Refer to [docs/prompt_handbook.md](docs/prompt_handbook.md) for ready-made snippet patterns.

---

## 6. Change request workflow (human ↔️ AI loop)

1. Copy `change_requests/CR-0000_example.yaml`, fill out summary, acceptance criteria, rollback plan, etc.
2. Commit/push the file. The GitHub Action validates and posts instructions in the run summary.
3. In Chat Mode, run the prompts in order:
   - `Execute autoforge/ai/prompts/change_request.yaml`
   - (If UX involved) `Execute autoforge/ai/prompts/uiux_designer.yaml`
   - `Execute autoforge/ai/prompts/impact_analysis.yaml`
   - Follow the chain (Fullstack → QA → Security → Performance → SRE → DevOps → Retrospective)
4. Record outputs to the paths defined in each prompt (`ai/logs/**`, `ai/reports/**`, etc.).

> Urgent defect? Run `Execute autoforge/ai/prompts/hotfix.yaml` instead. It keeps the scope to a single bug, enforces reproducibility, and still requires you to follow the commit rules in `docs/ai/COMMIT_PLAYBOOK.md`.

---

## 7. Stage gate checklist

Tick these items before shipping a slice:

- ✔ Idea: `autoforge/ideas/IDEA_*.yaml`
- ✔ UI/UX: `autoforge/docs/uiux/style_guide.md`, `wireframes.md`, `user_flows.md`, `accessibility_guidelines.md`, `ai/reports/uiux/*.md`
- ✔ Architecture: `autoforge/docs/blueprint/*.md`, `autoforge/diagrams/*.mmd`, `autoforge/api/openapi.yaml`
- ✔ Engineering outputs: `autoforge/ai/code_targets.yaml` paths contain new code (`../src/backend`, `../src/frontend`, `../tests` by default)
- ✔ QA: `autoforge/ai/logs/test_runs/latest_report.md`, `autoforge/qa/reports/defects.md`
- ✔ Security: `autoforge/security/reports/security_audit.md`, `autoforge/security/reports/findings.json`
- ✔ Performance: `autoforge/docs/perf/plan.md`, `autoforge/docs/perf/scripts/*`, `autoforge/ai/reports/perf/*.md`
- ✔ Observability: `autoforge/docs/observability/dashboards.md`, `alerts.md`, `slo.md`, `autoforge/ai/reports/observability/*.md`
- ✔ DevOps: `autoforge/devops/runbooks/deploy.md`, `autoforge/ai/logs/deployments/*_deploy.md`
- ✔ Retrospective: `autoforge/ai/reports/retrospective_*.md`

---

## 8. Demo slice (optional)

Need a sample to test? Point `ai/code_targets.yaml` to the demo directories and try:

- `examples/fullstack_todo_app/demo_src/backend/server.js`
- `examples/fullstack_todo_app/demo_src/frontend/index.html`
- `node --test examples/fullstack_todo_app/demo_src/tests/todo.test.js`

CI already runs this example as part of `.github/workflows/ci.yml`.

---

## 9. Generate REPOMIX snapshot (optional)

From `./autoforge`:

```bash
npm run repomix     # summarizes parent project by default
```

This creates `../REPOMIX.md` so AI tools can ingest the entire host project.

---

## 10. Helpful npm scripts

- `npm run validate` — ensures required docs/gates exist (`ai/context_targets.yaml` overrides respected).
- `npm run repomix -- [path]` — generates `REPOMIX.md` using the devDependency `repomix`.

---

## Links & resources

- 📘 General docs: [`docs/`](docs/)
- ⚡ Quickstart: [`docs/QUICKSTART.md`](docs/QUICKSTART.md)
- 🧪 Change requests: [`change_requests/`](change_requests/)
- 🧩 Prompts: [`ai/prompts/`](ai/prompts/)
- 🧠 Prompt patterns: [`docs/prompt_handbook.md`](docs/prompt_handbook.md)
- 📦 Example project: [`examples/fullstack_todo_app/`](examples/fullstack_todo_app/)

> “AutoForge lets you build software at the speed of thought — ideas in, deployments out.”
