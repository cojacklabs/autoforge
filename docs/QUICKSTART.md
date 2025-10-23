# 🧠 AutoForge — The Autonomous Software Development Framework

**AutoForge** is a fully autonomous, prompt-driven software development system.
It turns ideas, change requests, or design prompts into working, tested, and deployable software — with minimal or no manual coding.

This repository is designed to live as `./autoforge/` inside your existing project so you can orchestrate the SDLC via Chat Mode.

> 📘 Want the TL;DR? See [docs/QUICKSTART.md](docs/QUICKSTART.md) for a copy-paste walkthrough.

---

## 🚀 What AutoForge Does

AutoForge connects your GitHub workflows, LLM agents, and CI/CD pipelines into one cohesive loop.

### 🧩 Core Capabilities

- **Prompt → Code**: Submit ideas or change requests in YAML; agents handle design, architecture, development, QA, security, and deployment.
- **Multi-Agent Collaboration**: Product Manager, UI/UX Designer, Architect, Engineer, QA, Security, DevOps, and Retrospective roles, each with clear responsibilities.
- **Governance & Safety**: Context validation, quality gates, and write-protection ensure outputs meet your org’s standards.
- **Human Oversight Optional**: Keep a GO/NO-GO approval stage before production, or let the system run fully autonomous.

---

## 🧱 Repository Structure

```
autoforge/
├── ai/
│   ├── agents.yaml              # Defines agent roles, permissions, read/write scopes
│   ├── context.manifest.yaml    # Declares repo quality gates and governance rules
│   ├── code_targets.yaml        # Maps host project code/test directories
│   ├── prompts/                 # Role-specific YAML prompts (UI/UX, Architect, QA, DevOps, etc.)
│   ├── logs/                    # Auto-generated runtime logs
│   └── reports/                 # Generated summaries and retrospectives
│
├── api/openapi.yaml             # Base API contract for generated endpoints
├── change_requests/             # Drop a YAML here to trigger the autonomous pipeline
├── docs/                        # Product blueprint, PRD, UI/UX artifacts, etc.
│   └── uiux/                    # Wireframes, style guide, accessibility notes
├── (host project files stay outside this folder)
├── .github/workflows/           # CI/CD and agent processing workflows
└── scripts/                     # Context validation & helper scripts
```

---

## 🧩 How It Works

1. **You provide input**
   - Create an idea or change request using one of the templates in:
     - `ideas/IDEA_TEMPLATE.yaml`
     - `change_requests/CR-0000_example.yaml`

2. **GitHub Action triggers (manual by default)**
   - The `agent-change-processor.yml` workflow validates context and gives you Chat Mode instructions. (You remain in control of when agents run.)

3. **Agents collaborate**
   - Prompts under `ai/prompts/**` execute in sequence: Product Manager → UI/UX Designer → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective.

4. **Artifacts are produced**
   - Documentation, diagrams, runbooks, and logs remain inside AutoForge (`docs/`, `diagrams/`, `devops/`, `ai/logs/`, `ai/reports/`).
   - Application code and tests are generated in the paths declared in `ai/code_targets.yaml` (defaults: `../src/backend`, `../src/frontend`, `../tests`).

5. **CI/CD validates everything**
   - The `.github/workflows/ci.yml` pipeline ensures context, test coverage, and security checks pass.

6. **Optional GO/NO-GO approval**
   - A human or automated check decides if deployment proceeds.

---

## ⚙️ Getting Started

### 1. Clone / Embed AutoForge

```bash
# from your existing project root
git clone https://github.com/<your-org>/autoforge.git autoforge
cd autoforge
```

### 2. Install Dependencies

```bash
npm install
```

> Optional: `pip install pyyaml` if you intend to customise `ai/context_targets.yaml` using Python tooling.

### 3. Configure Paths

- Edit `ai/code_targets.yaml` so backend, frontend, and tests point to the directories in your host project (defaults assume `../src/backend`, `../src/frontend`, `../tests`).
- (Optional) Edit `ai/context_targets.yaml` if your documentation (PRD, blueprint, UI/UX, etc.) lives outside the defaults.

### 4. Validate Context

```bash
npm run validate
```

This enforces every quality gate declared in `ai/context.manifest.yaml`.

### 5. Kick Off (Chat Mode)

Paste the snippet below into your coding assistant (Codex, Claude Code, Gemini Code, Cursor, etc.):

```
Read and follow:
- autoforge/ai/context.manifest.yaml
- autoforge/ai/agents.yaml
- autoforge/ai/prompts/kickoff.yaml

Set working dir to ./autoforge.
List manifest entrypoints, confirm quality gates, and run the kickoff sequence:
Product Manager → UI/UX Designer → Architect → Engineer → QA → Security → Performance → SRE → DevOps → Retrospective.
Log outputs to autoforge/ai/logs/** and autoforge/ai/reports/**.
```

Continue prompting agent-by-agent as needed (e.g., `Execute autoforge/ai/prompts/fullstack_engineer.yaml`).

## 🔁 Change Request Workflow

1. Copy `change_requests/CR-0000_example.yaml` and fill in the summary, acceptance criteria, rollback plan, and affected areas.
2. Commit/push the file. GitHub Actions will validate context and post a summary in the job log.
3. Back in Chat Mode, run the chain:
   - `Execute autoforge/ai/prompts/change_request.yaml`
   - If UX is affected: `Execute autoforge/ai/prompts/uiux_designer.yaml`
   - `Execute autoforge/ai/prompts/impact_analysis.yaml`
   - Follow with Engineer → QA → Security → Performance → SRE → DevOps → Retrospective prompts
4. Record results under the paths defined in each prompt (logs under `ai/logs/**`, reports under `ai/reports/**`).

---

## 🧰 Configuration Files

| File                                           | Purpose                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `ai/context.manifest.yaml`                     | Defines governance, quality gates, and mandatory artifacts |
| `ai/agents.yaml`                               | Declares agent roles, permissions, and constraints         |
| `ai/prompts/*.yaml`                            | Role-specific behavior definitions                         |
| `ai/context_targets.yaml`                      | Optional overrides for documentation locations             |
| `.github/workflows/agent-change-processor.yml` | Watches for prompt events and launches the runtime         |
| `.github/workflows/ci.yml`                     | Runs validation, tests, and quality gates                  |
| `.github/workflows/deploy.yml`                 | Handles deployment pipeline                                |

---

## 📦 Embedding AutoForge in an Existing Project

You don’t need to fork this repo. Clone it into your project as a subfolder named `autoforge`:

```bash
cd /path/to/your-project
git clone https://github.com/<your-org>/autoforge.git autoforge
```

> Optional but recommended: update `autoforge/ai/code_targets.yaml` so the agents know where your project keeps application code, tests, and shared packages.

Then use Chat Mode with your coding AI and reference files under `autoforge/`:

```
Read and follow:
- autoforge/ai/context.manifest.yaml
- autoforge/ai/agents.yaml
- autoforge/ai/prompts/kickoff.yaml

Confirm that you have successfully read these files.
List all entrypoints found in the manifest, then prepare to execute the kickoff sequence.
Do not code yet; just acknowledge readiness.
```

Then instruct the assistant:

```
Set your working directory to ./autoforge. All file operations must remain inside this folder.
Execute autoforge/ai/prompts/kickoff.yaml.
Follow each role’s constraints and deliverables.
Log outputs to autoforge/ai/logs/** and autoforge/ai/reports/**.
Halt and escalate if any quality gate or required input is missing.
```

When invoking specific roles:

- `Execute autoforge/ai/prompts/uiux_designer.yaml`
- `Execute autoforge/ai/prompts/architect.yaml`
- `Execute autoforge/ai/prompts/fullstack_engineer.yaml`

Planning artifacts stay inside the `autoforge/` folder (logs, reports, docs, diagrams, runbooks). Application code and tests follow the paths configured in `autoforge/ai/code_targets.yaml` (defaults: `../src/backend`, `../src/frontend`, `../tests`).

### Stage Gate Checklist (Embedded Mode)

- UI/UX Designer: `autoforge/docs/uiux/style_guide.md`, `autoforge/docs/uiux/wireframes.md`, `autoforge/docs/uiux/user_flows.md`, `autoforge/docs/uiux/accessibility_guidelines.md`, `autoforge/ai/reports/uiux/*.md`
- Architect/Impact: `autoforge/docs/blueprint/*.md`, `autoforge/diagrams/*.mmd`, `autoforge/api/openapi.yaml`
- Full-Stack Engineer: Application code/tests generated under the paths declared in `autoforge/ai/code_targets.yaml` (defaults: `../src/backend`, `../src/frontend`, `../tests`)
- QA: `autoforge/ai/logs/test_runs/latest_report.md`, `autoforge/qa/reports/defects.md`
- Security: `autoforge/security/reports/security_audit.md`, `autoforge/security/reports/findings.json`
- Performance: `autoforge/docs/perf/plan.md`, `autoforge/docs/perf/scripts/*`, `autoforge/ai/reports/perf/*.md`
- SRE/Observability: `autoforge/docs/observability/*.md`, `autoforge/ai/reports/observability/*.md`
- DevOps: `autoforge/devops/runbooks/deploy.md`, `autoforge/ai/logs/deployments/*_deploy.md`
- Retrospective: `autoforge/ai/reports/retrospective_*.md`

### Configure Code Output Paths

- Edit `autoforge/ai/code_targets.yaml` to point to your project’s backend, frontend, and test directories.
- Prompts read this file to decide where generated code should live (e.g., `../services/api`, `../apps/web`, `../tests/frontend`).
- Planning documents, diagrams, runbooks, and logs always remain inside the `autoforge/` directory.

### Configure Documentation Targets

- Edit `autoforge/ai/context_targets.yaml` if your blueprint/PRD/UI/UX/research docs live outside the defaults.
- Prompts and validation read this file alongside the defaults to locate specs, style guides, and reports.
- If you move files, update the manifest and this configuration so validation continues to pass.

### Generate REPOMIX Snapshot

- Run `npm run repomix -- [path]` to capture a flattened snapshot of your project.
- If you run from `./autoforge` with no path, AutoForge summarizes the parent directory by default (your host project).
- Example (embedded): from your project root run `(cd autoforge && npm run repomix)` to produce a top-level `REPOMIX.md` for AI analysis.
- Adjust `repomix.config.json` to include or exclude folders (e.g., ignore `ai/logs/**`, `ai/reports/**`, or add host project directories).

### Useful npm Scripts

- `npm run validate` – Validates that required docs and gates are present (respects `ai/context_targets.yaml`).
- `npm run repomix -- [path]` – Generates `REPOMIX.md` using the devDependency `repomix`.

---

## 🧩 Quality Gates & Autonomy

AutoForge enforces:

- ✅ OpenAPI spec present
- ✅ Architecture diagram available
- ✅ PRD & research policy defined
- ✅ Security checklist complete
- ✅ Observability dashboards documented
- ✅ Context validated before generation

If any are missing, the system halts and raises a “Context Gap” report in `ai/logs/mastermind/`.

---

## 🧪 Demo: Runnable TODO Slice (Code Targets)

You can try a small runnable slice under `examples/fullstack_todo_app/demo_src/` to see
how `ai/code_targets.yaml` maps application code to your host project structure.

1. Point the code targets to the demo paths (from `autoforge/`):
   - backend: `../examples/fullstack_todo_app/demo_src/backend`
   - frontend: `../examples/fullstack_todo_app/demo_src/frontend`
   - tests: `../examples/fullstack_todo_app/demo_src/tests`
2. Run the server:
   ```bash
   node examples/fullstack_todo_app/demo_src/backend/server.js
   ```
3. Open the UI:
   - Visit http://localhost:3001 in your browser to load the demo UI.
4. (Optional) Run tests:
   ```bash
   node --test examples/fullstack_todo_app/demo_src/tests/todo.test.js
   ```

This demonstrates how code generated by agents can live outside `autoforge/` while
planning artifacts remain inside `autoforge/`.

---

## 🧭 Optional TODOs (from GPT‑5 Readiness)

To further enhance onboarding and automation:

1. Flesh out the example with actual code/tests (beyond the demo slice) to showcase a realistic UI + API.
2. Add a full E2E runnable example under `examples/` with step‑by‑step scripts.
3. Continue expanding per‑folder READMEs with richer prompt snippets for more guidance.

Contributions welcome! If you’re interested in owning any of these, open an issue.

## 🧠 Extending AutoForge

You can extend AutoForge by:

- Adding new agents under `ai/prompts/` (e.g., UX Designer, Data Engineer).
- Updating CI/CD workflows to match your cloud provider.
- Replacing the runtime with your preferred LLM or orchestration framework (LangChain, AutoGen, CrewAI, etc.).

---

## 💡 Example Usage Flow

```bash
# Submit a change request
git add change_requests/CR-0002_add_auth.yaml
git commit -m "Add authentication system request"
git push

# Watch the pipeline
# → PR opens with generated code, tests, and docs
# → CI runs validation and tests
# → Deployment waits for GO/NO-GO approval
```

---

## 🛡️ License

MIT License © 2025
You’re free to fork, adapt, and extend AutoForge for your own projects.

---

## 📦 Example Project

An illustrative flow lives under `examples/fullstack_todo_app/`. Browse the subfolders to see how an idea moves through research, blueprint, UI/UX, change requests, QA, DevOps, and retrospectives.

## 🤝 Contributing

Pull requests are welcome!
If you’d like to add new agent types, extend the runtime interface, or contribute documentation, open an issue or submit a PR.

---

## 🌐 Links & Resources

- 📘 Documentation: [`docs/`](docs/)
- ⚡ Quickstart: [`docs/QUICKSTART.md`](docs/QUICKSTART.md)
- 🧩 Prompts Library: [`ai/prompts/`](ai/prompts/)
- 🧪 Change Requests: [`change_requests/`](change_requests/)
- 🧠 Blueprint: [`docs/blueprint/`](docs/blueprint/)

---

> “AutoForge lets you build software at the speed of thought — ideas in, deployments out.”
