# 🎯 AutoForge — Strategic Vision Document

> Generated: 2026-08-16 | Version: 0.4.1 | For internal planning and AI onboarding reference

---

## The Ultimate Goal

AutoForge's endgame can be stated in a single sentence:

> **Transform any Node.js project into a self-running, self-improving software factory where AI agents collectively own the full SDLC, and the developer's only job is to define the goal and review escalations.**

---

## Layer 1 — The Scaffolding Layer ✅ Shipped (v0.4.1)

When a developer runs `npx autoforge init`, the framework injects a `.autoforge/` directory into their existing project. This directory becomes the **brain** of the project, containing:

| File / Dir              | Purpose                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents.yaml`           | 14 specialized agents (PM, Architect, Engineer, QA, Security, SRE, DevOps, Compliance, Payments, etc.), each with strict file read/write boundaries |
| `context.manifest.yaml` | The canonical truth document; defines what files must exist before agents can act                                                                   |
| `ai/prompts/`           | Role-specific YAML prompts that tell each AI exactly how to behave at each SDLC phase                                                               |
| `ai/memory/`            | Persistent cross-session memory so no context is ever lost between AI conversations                                                                 |
| `autoforge.config.json` | Tells agents _where_ the real code lives (e.g. `src/backend`, `src/frontend`, `tests`) so they never touch files outside their declared targets     |

The CLI's `load` command prints a single block of orchestrator context that any developer can paste into Claude, Gemini, or Codex — instantly turning their AI into a disciplined, role-aware engineering team.

### Current CLI Commands

| Command                     | Description                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| `autoforge init [--force]`  | Scaffold `.autoforge/` and `autoforge.config.json`               |
| `autoforge load`            | Print copy/paste stub to load orchestrator context into AI       |
| `autoforge snapshot [path]` | Generate `REPO.md` for audits and handover                       |
| `autoforge configure`       | Regenerate managed YAML files from config (safe)                 |
| `autoforge refresh`         | Emit a context-reload prompt to re-read policies + latest memory |
| `autoforge version`         | Print CLI version                                                |

---

## Layer 2 — The Autopilot Layer 🟡 Designed, Partially Built

The next layer is an **orchestration state machine** driven by a single CLI flag:

```bash
npx autoforge autopilot --level 1
```

### Autonomy Levels

| Level | Name           | Who Drives                                          | Human Time/Project | Use Case                               |
| ----- | -------------- | --------------------------------------------------- | ------------------ | -------------------------------------- |
| `0`   | Manual         | Human triggers every agent                          | ~6–8 hrs           | Complex, high-risk, first-time         |
| `1`   | Supervised     | Agents run; pause on deployments/security           | ~45 min            | Standard projects, known architectures |
| `2`   | Full Autopilot | Agents decide everything; log it all                | ~10 min            | Proven recipes, mature teams           |
| `3`   | Adaptive       | Agents learn, update their own prompts, self-deploy | ~5 min             | Continuous deployment, feedback-driven |

### Orchestration State Machine (Autopilot Loop)

```
initialization
  → load_active_memory
  → validate_context_manifest
  → bootstrap_meta_agent
  → execute_idea_intake (if new project)
  → select_recipe based on project_type

execution_loop [plan → design → code → test → deploy]
  → agent_runs_stage
  → collect_outputs
  → validate_quality_gates
    → PASS: log decision, emit handoff signal, proceed
    → FAIL: auto-retry (max 3x with refined prompt)
      → still FAIL: escalate to human with full diagnostic summary

completion
  → aggregate_logs
  → compute_success_metrics
  → feed_training_loop
```

### Agent Assembly Line (8 Core Roles)

| Order | Agent                    | Primary Objective                                       | Handoff To             |
| ----- | ------------------------ | ------------------------------------------------------- | ---------------------- |
| 1     | `discovery_researcher`   | Investigate ideas, compile feasibility briefs           | product_manager        |
| 2     | `product_manager`        | Translate ideas into blueprints and PRD                 | architect              |
| 3     | `architect`              | Design systems, diagrams, and API contracts             | fullstack_engineer     |
| 4     | `fullstack_engineer`     | Implement code, migrations, automated tests             | qa_engineer            |
| 5     | `qa_engineer`            | Validate functionality, performance, regression         | security_engineer      |
| 6     | `security_engineer`      | Threat modeling, dependency audits, policy checks       | devops_engineer        |
| 7     | `devops_engineer`        | CI/CD, deploy across environments, runbooks             | mastermind_coordinator |
| 8     | `mastermind_coordinator` | Orchestrate workflows, enforce quality gates, summarize | human approver         |

### Optional Specialist Roles

- `uiux_designer` — Wireframes, user flows, style guide, accessibility
- `performance_engineer` — SLIs/SLOs, load testing, tuning recommendations
- `sre_engineer` — Observability, dashboards, alerts, runbooks
- `integration_engineer` — Third-party API connectors with schema validation
- `payments_engineer` — Stripe subscriptions, invoicing, webhooks, reconciliation
- `data_analyst` — KPIs, metrics glossary, analytics dashboards
- `compliance_officer` — SOC2/GDPR audit artifacts, control mapping

---

## Layer 3 — The Self-Improvement Layer 🔴 Designed, Not Yet Built

This is what makes AutoForge unique against any other AI coding framework. A **closed-loop training pipeline** where:

1. **Collect** — Every agent execution logs telemetry: gate pass/fail, retry count, token usage, human overrides, downstream agent feedback
2. **Extract** — A pattern extractor identifies failure root causes (e.g. "architect prompt produces incomplete API contracts 25% of the time")
3. **Improve** — A suggestion engine proposes prompt improvements, A/B tests them across real projects, and deploys the winning version
4. **Propagate** — Cross-project learning means every project makes the system smarter for all future projects

### Projected Improvement Curve

| Metric                         | Baseline | After 10 Projects | After 50 Projects |
| ------------------------------ | -------- | ----------------- | ----------------- |
| Gate failure rate              | 25%      | 8%                | 2%                |
| Avg retries per task           | 1.8      | 0.6               | 0.3               |
| Time to first prototype        | 4 hrs    | 2 hrs             | 45 min            |
| Token cost (tokens/LOC)        | 450      | 350               | 200               |
| Security issues missed         | 8%       | 2%                | 0.5%              |
| Autonomous decision confidence | 60%      | 78%               | 88%               |

### Six Closed Feedback Loops

1. Gate failures → prompt improvement → A/B test → deploy winning version
2. Human overrides → context enrichment → retest → measure improvement
3. Downstream agent feedback → handoff template refinement → measure satisfaction
4. Quality regression → investigate root cause → prevent future regressions
5. Token inefficiency → optimize prompt → measure savings
6. Autonomy miscalibration → adjust thresholds → retest success rate

### Recipe Evolution (How Projects Get Faster)

```
gis_investment_v1 (week 1):  67% success — baseline
gis_investment_v2 (week 3):  95% success — parallelized architect + UI/UX, added security requirements earlier
gis_investment_v3 (week 6):  98% success — tighter gate for test coverage (90%+ required)

Each version is measurably better. Recipes become competitive advantages.
```

---

## The Full Developer Experience (Target State)

```
Developer: "npx autoforge autopilot --level 2"
           "Build a SaaS invoicing app with Stripe integration."

AutoForge:
  → Loads memory (past decisions, approved stack, prior learnings)
  → Selects best recipe from docs/blueprint/recipes/
  → PM writes PRD                           [gate ✅]
  → UI/UX produces wireframes               [gate ✅]
  → Architect produces diagrams + OpenAPI   [gate ✅]
  → Engineer writes code + tests            [gate ❌ → auto-retry → ✅]
  → QA validates                            [gate ✅]
  → Security audit                          [gate ✅]
  → DevOps deploys to staging               [pause: awaiting human approval]

Developer: "Approved."

AutoForge:
  → Deploys to production
  → Monitors error rate vs SLO
  → Auto-rollbacks if error_rate > threshold
  → Commits training data for next project
  → Emits retrospective report

Total developer time: ~10 minutes of review.
```

---

## Implementation Roadmap

### Phase 1 — Foundation (Weeks 1–2)

- Define orchestration state machine
- Extend ACTIVE_MEMORY schema for decisions/assumptions
- Implement agent autonomy matrix
- Build quality gate auto-fix logic

### Phase 2 — Autopilot Execution (Weeks 3–4)

- Implement orchestration runner (state machine executor)
- Build decision executor (agent autonomy enforcement)
- Implement escalation handler with human-readable summaries
- Add session memory manager (mid-execution resume capability)
- CLI: `npx autoforge autopilot --level <0-3>`

### Phase 3 — Training Pipeline (Weeks 5–6)

- Build training data collector (hooks into every stage)
- Implement pattern extractor (identify what works/doesn't)
- Build suggestion engine (output prompt improvements)
- Create metrics dashboard
- CLI: `npx autoforge train --from-last-N-projects 10`

### Phase 4 — Integration & Polish (Weeks 7–8)

- End-to-end tests (idea → shipping code on L2 autopilot)
- Comprehensive documentation for all autonomy levels
- Metrics aggregation and quarterly trending reports
- Sample recipes showing version evolution

**Total estimated effort:** ~114 hours (3 engineers × 4 weeks) or (1 engineer × 4 months)

---

## Success Metrics (Quarterly Targets)

### Q1 — Autopilot Foundation

| Metric                             | Target         |
| ---------------------------------- | -------------- |
| Projects completed on L1 autopilot | 80%            |
| Avg human involvement time         | 45 min/project |
| Gate success rate (first attempt)  | 80%            |
| Escalation rate                    | < 15%          |

### Q2 — Training Pipeline

| Metric                             | Target |
| ---------------------------------- | ------ |
| Gate success rate                  | 90%    |
| Projects completed on L2 autopilot | 40%    |
| Avg retries per gate               | < 0.8  |
| Token efficiency improvement       | +15%   |

### Q3 — Full Integration

| Metric                    | Target |
| ------------------------- | ------ |
| Gate success rate         | 95%+   |
| Projects on L3 autopilot  | 20%    |
| Human satisfaction survey | 4.5/5  |
| Recipe success rate vs v1 | +25%   |

---

## The Core Thesis

> _"Before: agents handle 20% of the time, human handles 80%._
> _After: agents handle 95%+, human handles the creative goal-setting and exception cases."_

AutoForge is not a prompt library or a code generator. **It is a persistent, project-aware, role-based engineering organization that lives inside your repo, gets smarter with every project it ships, and eventually needs you only to tell it what to build next.**

---

## Key Files for AI Onboarding Reference

| File                                    | Why It Matters                                         |
| --------------------------------------- | ------------------------------------------------------ |
| `.autoforge/ai/context.manifest.yaml`   | Quality gates and context roots — read this first      |
| `.autoforge/ai/agents.yaml`             | All agent roles, permissions, read/write boundaries    |
| `.autoforge/ai/prompts/kickoff.yaml`    | Entry point for a new project session                  |
| `.autoforge/ai/memory/`                 | Persistent decisions and assumptions across sessions   |
| `autoforge.config.json`                 | Code target paths and quality policy commands          |
| `docs/AUTOFORGE_AUTOPILOT_ENGINE.md`    | Full orchestration spec and autonomy level details     |
| `docs/AUTOFORGE_AI_MODEL_TRAINING.md`   | Training pipeline, feedback loops, improvement metrics |
| `docs/AUTOFORGE_EXPANSION_SYNTHESIS.md` | Before/after comparison, roadmap, success metrics      |
| `docs/PROMPT_HANDBOOK.md`               | Ready-made prompts for all agent roles                 |
| `docs/QUALITY_POLICIES.md`              | TypeScript/ESLint/Prettier/artifact validation rules   |
