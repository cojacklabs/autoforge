# AutoForge Orchestration Framework Review

**Prepared by:** Manus AI  
**Date:** August 16, 2026  
**Basis of review:** The supplied project overview, strategic vision, and repository snapshot. This is an architecture and implementation review; it is not the result of executing or integration-testing the repository.

## Executive assessment

AutoForge has a **strong control-plane foundation**: it defines roles, artifact boundaries, context roots, quality gates, prompts, change requests, and a useful planning-first SDLC model. The core idea is sound: make an AI-assisted development effort behave like an accountable engineering organization rather than an unstructured chat session. The project’s strategic intent is particularly clear:

> “Transform any Node.js project into a self-running, self-improving software factory where AI agents collectively own the full SDLC…” [2]

The immediate priority, however, is **not to add more prompts or agent roles**. It is to turn the existing documentation-led framework into a small, reliable execution system that gives teams one source of truth for work, decisions, approvals, evidence, and ownership. Today, AutoForge should be positioned as a **structured AI development playbook with prototype runtime components**, rather than as a production-ready autopilot. The product documentation presents `autopilot`, `status`, `train`, and `metrics` workflows, while the reviewed CLI dispatcher exposes only initialization, configuration, snapshot, loading, refresh, version, and help commands. [3]

The recommended strategy is therefore:

1. **Stabilize and truthfully package the shipped framework.**
2. **Build a durable orchestration kernel for supervised operation (L0/L1).**
3. **Make work items, evidence, human approvals, and Git-based delivery the center of collaboration.**
4. **Pilot autonomy on low-risk recipes and measure it before permitting higher autonomy.**
5. **Treat learning as a governed recommendation system first—not autonomous prompt self-modification.**

This sequencing will help development teams stay focused because every task has a defined owner, bounded scope, explicit readiness criteria, a current state, and an evidence-backed path to completion.

## What is already valuable

| Existing asset                                       | Why it is useful                                                                                                                                                                       | Recommended retention                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `.autoforge` scaffold and config-driven code targets | Separates planning artifacts from application code and makes repository-specific paths explicit. [1]                                                                                   | Keep as the project-local control plane.                                  |
| Role prompts and read/write boundaries               | Establishes specialization and reduces uncontrolled edits. The agent catalog already covers product, design, architecture, engineering, QA, security, operations, and specialists. [4] | Retain, but convert role definitions into executable capability policies. |
| Context manifest and canonical artifacts             | Creates a shared map of PRD, architecture, API, QA, security, DevOps, and memory inputs. [5]                                                                                           | Keep; add versioned artifact contracts and freshness checks.              |
| Schema-based planning artifacts                      | `UserAsk`, `IssueReport`, `CodePlan`, and `TestPlan` are the right direction for contract-first delivery. [6]                                                                          | Expand into a work-item and evidence model.                               |
| Quality-gate policies                                | The prescribed ordering—parse, formatting, linting, type-checking, and tests—is a practical baseline. [7]                                                                              | Make gate execution deterministic and persist results as evidence.        |
| Recipes, change requests, retrospectives, and memory | These concepts can form a coherent team operating system rather than a loose prompt collection. [2]                                                                                    | Make each first-class and connected through IDs and state transitions.    |

## Principal gaps and risks

| Priority | Finding                                                                                                                                                                                                                                     | Why it matters to teams                                                                                                      | Recommendation                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | **Documentation and executable behavior diverge.** The CLI dispatcher does not implement the documented autopilot, status, training, metrics, dry-run, doctor, upgrade, or validate paths, despite some helper functions being present. [3] | Teams lose trust when the advertised workflow does not execute, and work reverts to manual prompt coordination.              | Correct the command surface immediately; clearly mark planned features as preview or unavailable.                                              |
| Critical | The current `Coordinator` is a narrow prototype, not a recipe-driven SDLC engine. It hard-codes a small linear DAG and invokes PM/UI/UX/engineering/QA adapters rather than running the declared role/recipe system. [6]                    | It cannot reliably coordinate a multi-team application lifecycle or resume a real project.                                   | Replace it with a declarative state-machine interpreter and durable run store.                                                                 |
| Critical | The reviewed coordinator includes a duplicate `const allowedRoots` declaration in the same method scope, which would prevent the module from loading as written. [6]                                                                        | The orchestration prototype needs a clean, testable baseline before higher-level features can be trusted.                    | Add runtime smoke tests, lint/type checks for the package itself, and fix prototype correctness defects before expansion.                      |
| Critical | Code application is illustrative rather than implementation-capable: the engineer adapter creates TODO files or appends comments, while QA evaluation is explicitly a stub. [6]                                                             | A team cannot rely on this path to safely build an application.                                                              | Keep code generation behind a provider adapter and isolated workspace; make merge/PR creation the output, not direct main-branch modification. |
| High     | Memory is append-only Markdown with short excerpts in the runtime, whereas the intended design calls for structured active state, decisions, assumptions, blockers, history, and resume behavior. [2] [6]                                   | Concurrent work, handoffs, and resumes will become ambiguous and error-prone.                                                | Use a versioned, transactional run-state model with immutable events and materialized views.                                                   |
| High     | Governance is described well in prompts, but it is not yet a compiled, deterministic decision-policy engine. [2] [7]                                                                                                                        | A natural-language rule is not a reliable control when an agent makes a deployment, dependency, migration, or data decision. | Encode policies as machine-evaluated decision classes, approvals, conditions, and evidence requirements.                                       |
| High     | Several role instructions conflict with the embedded-project model: some prompts prohibit edits outside AutoForge while engineering must write to configured host-project targets. [4]                                                      | Ambiguity causes unnecessary stoppages or accidental boundary violations.                                                    | Establish a single boundary contract: planning workspace, managed host-code roots, and prohibited roots.                                       |
| Medium   | Telemetry is currently a JSONL append mechanism, not the event model needed for retries, parent steps, costs, quality results, and auditability. [6]                                                                                        | Teams cannot diagnose bottlenecks, compare recipes, or prove why a decision was made.                                        | Introduce typed run events, correlations, evidence links, and a read-only status projection.                                                   |
| Medium   | The self-improvement plan proposes automated prompt/recipe improvement, but lacks evaluation baselines, privacy policy, experiment isolation, rollback, and release approval. [2]                                                           | An unvalidated prompt update can degrade performance or weaken controls across projects.                                     | Begin with **suggestions only**, evaluated on golden tasks and approved through a change request.                                              |

## Recommended target operating model

AutoForge should be designed as a **team orchestration layer**, not as a substitute for engineering management. AI agents may prepare work and execute bounded actions; accountable humans retain ownership of product direction, technical risk, release authority, and policy exceptions.

| Human role                     | Primary accountability                                                      | AutoForge responsibility                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Product owner                  | Value, scope, priority, acceptance criteria                                 | Convert intent into a structured work item; flag ambiguity and scope changes.            |
| Delivery lead / technical lead | Flow, sequencing, architecture coherence, WIP limits                        | Select recipe, approve plans, resolve cross-domain conflicts, and review escalations.    |
| Change owner                   | A specific feature, bug, migration, or incident from intake through closure | Own the work-item record, evidence, status, and follow-up.                               |
| Engineering lead               | Code quality, maintainability, dependencies, technical design               | Review implementation plan and approve controlled code/PR actions.                       |
| QA and security owners         | Release quality and risk acceptance                                         | Own independent gates; an agent may gather evidence but cannot waive a blocking failure. |
| Platform / DevOps owner        | Environment, deployment policy, rollback, operational readiness             | Maintain deployment and production access controls.                                      |

The change owner need not be a new job title. It can be the engineer, product manager, or technical lead best positioned to close a particular item. The important rule is that **every active work item has exactly one accountable human owner** and one current orchestration state.

### Work-item lifecycle

The current change-request files should evolve into the canonical work object. A work item should include an ID, objective, owner, risk tier, bounded acceptance criteria, linked artifacts, dependencies, state, approvals, gate evidence, and final outcome.

```text
Draft → Ready for Planning → Plan Review → Ready to Build → Building
      → Verify → Release Candidate → Awaiting Approval → Released → Observed → Closed
                           ↘ Blocked / Replan / Cancelled
```

No agent should advance a work item merely because it produced text. A transition must be enabled by a policy check and evidence. For example, `Ready to Build` requires a validated plan, test plan, affected paths, dependencies, and an assigned human owner. `Release Candidate` requires passing build/test/security gates and a rollback plan. `Released` requires the required approval and deployment evidence.

## Target technical architecture

The architecture should begin locally and remain simple: a Node.js CLI, a repository-local SQLite database, structured files for portable artifacts, and JSONL export for audit/analytics. A server or cloud control plane is unnecessary for the first supervised release.

```text
CLI / CI / IDE command
        │
        ▼
Orchestration kernel ── Policy engine ── Approval service
        │                     │
        ├── Durable run store / event log
        ├── Recipe + dependency scheduler + locks
        ├── Artifact registry and schema validator
        ├── Quality-gate executor and evidence store
        ├── Agent-provider adapters and isolated worktree executor
        └── Status, escalation, and retrospective projections
```

### Core domain objects

| Object       | Minimum fields                                                                 | Purpose                                                     |
| ------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `WorkItem`   | ID, objective, owner, risk tier, status, acceptance criteria, linked branch/PR | The unit the team manages.                                  |
| `Run`        | ID, work item, recipe version, autonomy policy, start/end, result              | One orchestration attempt that can be resumed or cancelled. |
| `Step`       | ID, parent, state, role, inputs, outputs, retry count, lease/lock              | A schedulable unit in the recipe DAG.                       |
| `Artifact`   | ID, type, schema version, hash, path/URI, producer, freshness                  | A typed handoff contract.                                   |
| `GateResult` | gate ID, command/evaluator, status, evidence, timestamp, waiver                | Proof that a state transition is safe.                      |
| `Decision`   | decision class, actor, rationale, confidence, policy outcome                   | The audit record for choices and trade-offs.                |
| `Approval`   | approver, scope, expiry, decision, note                                        | A bounded human authorization, not a vague acknowledgement. |
| `Escalation` | cause, impact, options, recommendation, required responder                     | A concise interruption that preserves momentum.             |

A state transition should be idempotent and durable. If a process stops after QA but before a release decision, `autoforge resume` must reconstruct the exact pending approval rather than re-running earlier stages or relying on conversational memory.

## Autonomy and governance: make policy risk-based

Retain the familiar autonomy levels for user ergonomics, but implement decisions through **risk classes**, not a single global level. A project may safely allow automated drafting while forbidding automatic dependency addition or production release.

| Decision class                                                                       | L0: manual                | L1: supervised (recommended default)         | L2: constrained pilot                           | L3: adaptive                               |
| ------------------------------------------------------------------------------------ | ------------------------- | -------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Read context, draft artifacts, run non-mutating checks                               | Human starts every action | Automated and logged                         | Automated                                       | Automated                                  |
| Update planning artifacts / create a change branch                                   | Human approval            | Automated when scope is unchanged            | Automated                                       | Automated                                  |
| Write code and repair non-security test failures                                     | Human approval            | Create patch/PR; human merge                 | Auto-merge only within proven policy            | Same as L2                                 |
| Add dependency, migration, external integration, permission change                   | Human approval            | Human approval                               | Human approval unless explicitly pre-authorized | Human approval                             |
| Staging deployment                                                                   | Human approval            | Human approval or pre-authorized environment | Policy-controlled                               | Policy-controlled                          |
| Production deployment, deletion, live-data migration, secret access, security waiver | Human approval            | Human approval                               | Human approval                                  | Human approval                             |
| Prompt/recipe modification                                                           | Human approval            | Suggestion only                              | Experiment with approval                        | Experiment and promote only after approval |

This intentionally keeps high-impact actions human-governed. It preserves the project’s safety goal while avoiding the false choice between “manual everything” and “agents decide everything.” The existing vision correctly emphasizes approval, auditability, bounded retries, and security as a non-negotiable arbiter. [2] [7]

## A focus-preserving workflow for application teams

A well-designed AutoForge run should reduce administrative overhead, not introduce a second project-management system. The following cadence provides enough structure without forcing teams to monitor agents continuously.

| Moment        | System action                                                                                 | Human attention required                                     |
| ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Intake        | Create work item, identify owner, classify risk, request only missing high-signal information | Product owner confirms intent and acceptance criteria.       |
| Planning      | Produce linked PRD slice, architecture delta, code plan, test plan, and dependency map        | Technical lead reviews a single plan bundle.                 |
| Build         | Create isolated branch/worktree, execute bounded agent tasks, run fast checks continuously    | No intervention unless policy or gate requires it.           |
| Verification  | Run test, security, performance, and artifact gates; assemble evidence                        | QA/security review exceptions, not routine pass results.     |
| Release       | Prepare deployment plan, rollback plan, release notes, and approval card                      | Authorized release owner approves only the release decision. |
| Retrospective | Calculate flow, quality, rework, and intervention metrics; issue improvement suggestions      | Team reviews a short weekly or sprint report.                |

Two constraints are especially important. First, impose a **WIP limit** per team or repository: no new build run should start if too many items are in `Building` or `Verify`. Second, bind every change to one scope statement and acceptance criteria; if an agent finds adjacent work, it must create a linked follow-up rather than silently expanding the current change.

## Phased delivery roadmap

| Phase                                           | Objective and scope                                             | Key deliverables                                                                                                                                                                                     | Exit criteria                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **0. Stabilize** (1–2 weeks)                    | Make the product honest, runnable, and testable.                | Fix coordinator syntax/runtime defects; reconcile CLI documentation and dispatcher; add command-level smoke tests; mark non-shipped commands as preview; add CI for CLI, schema, and package checks. | A clean install supports every documented “shipped” command, and unsupported commands fail with a clear roadmap message. |
| **1. Orchestration kernel** (3–5 weeks)         | Deliver reliable L0/L1 run control.                             | Versioned recipe schema; SQLite run/event store; state-machine interpreter; artifact registry; locks; `autopilot --dry-run`, `status`, `resume`, `cancel`, and `approve`.                            | A run can pause, resume, retry, cancel, and reproduce its state with evidence.                                           |
| **2. Team delivery integration** (3–5 weeks)    | Make the framework useful in normal feature work.               | Work-item schema; Git branch/PR adapter; deterministic gate runner; approval cards; escalation templates; daily/sprint digest.                                                                       | A feature can move intake → PR → verified release candidate with a full trace.                                           |
| **3. Safety and isolation** (2–4 weeks)         | Make controlled mutation safe.                                  | Worktree/container sandbox; compiled path and command allowlists; secrets isolation; signed/append-only audit export; rollback evidence.                                                             | L1 pilot can create bounded patches without touching protected branches or undeclared paths.                             |
| **4. Measured L2 pilot** (4–6 weeks)            | Prove constrained autonomy on a low-risk recipe.                | Golden evaluation tasks; baseline metrics; policy eligibility checks; experiment dashboard; rollback playbook.                                                                                       | At least 10 comparable runs meet agreed quality, traceability, and intervention thresholds.                              |
| **5. Governed learning** (after pilot evidence) | Improve prompts and recipes without self-inflicted regressions. | Telemetry schemas; de-identification/retention controls; suggestion generator; offline evaluation; approved A/B experiments; versioned promotion process.                                            | Improvements beat baseline on golden tasks and production-pilot metrics before promotion.                                |

The project’s existing roadmap places a training pipeline soon after autopilot. [2] I recommend reversing the emphasis: **measurement and evaluation should precede optimization**. Learning data is only valuable when the underlying run states, artifacts, gate results, and human decisions are trustworthy.

## Metrics that show whether teams are becoming more focused

Establish baselines before the L1 pilot, then review weekly at the work-item and recipe level.

| Dimension    | Primary metric                                                         | Healthy direction                                                |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Flow         | Median time in each state; age of active WIP                           | Less waiting and fewer stale items.                              |
| Focus        | Scope-change rate after `Ready to Build`; unplanned work ratio         | Lower scope churn and less context switching.                    |
| Quality      | First-pass gate rate; rework loops; escaped defects                    | More first-pass success and fewer downstream returns.            |
| Human burden | Minutes of human intervention per work item; approval decision latency | Human time shifts to high-value review rather than coordination. |
| Reliability  | Resume success rate; duplicate execution rate; evidence completeness   | Runs resume predictably and every decision is traceable.         |
| Autonomy     | Escalation rate by risk class; override rate; post-merge defect rate   | Autonomy expands only where outcomes stay stable.                |
| Cost         | Agent/tool cost per accepted work item and per successful gate         | Cost is visible and improves without quality degradation.        |

Do not set an arbitrary target such as “95% automation” as the primary objective. The objective is **predictable, auditable delivery with less coordination overhead**. Increased autonomy is an earned result of quality and control—not a goal to optimize in isolation.

## Recommended immediate backlog

1. **Create an implementation truth matrix** that maps every public command and documented capability to `shipped`, `beta`, `planned`, or `removed`. Update the README, quickstart, changelog, and CLI help in one change.
2. **Repair and test the runtime prototype** before using it as the basis of the new engine. Add unit tests for parsing, policy evaluation, state transitions, retry exhaustion, approval expiry, resume, locking, and path enforcement.
3. **Define `WorkItem.v1`, `Run.v1`, `Step.v1`, `Decision.v1`, `GateResult.v1`, and `Approval.v1` schemas.** Use IDs and hashes to link every handoff.
4. **Implement `autoforge autopilot --dry-run` first.** It should validate configuration, expand a recipe into a DAG, show required approvals and gates, and write no code.
5. **Implement L1 only.** The first real runner should draft artifacts, execute non-mutating gates, create an isolated branch/PR, and pause for explicitly classified approvals.
6. **Add a release eligibility policy.** Production deployment, data deletion, live migrations, secrets, and security waivers should remain human-approved at every level.
7. **Build a small status view before a dashboard.** `autoforge status <run-id>` and a Markdown/JSON run summary are sufficient for the first pilots.
8. **Pilot against two low-risk, repeatable recipes.** Examples include a documentation-led API feature and a UI enhancement with existing test coverage. Avoid greenfield, payment, production-migration, or compliance-heavy work until L1 is proven.

## Final recommendation

AutoForge can become a highly useful framework for disciplined AI-assisted application delivery, but it should first become a **reliable execution coordinator for human engineering teams**. Its durable advantage will not be the number of agents or length of prompts. It will be the quality of its work-item state model, artifact contracts, approval policies, evidence collection, and ability to reduce coordination burden without obscuring responsibility.

The appropriate near-term product promise is:

> **AutoForge organizes AI-assisted development into accountable, evidence-backed delivery runs—so teams can focus on product and engineering judgment rather than repeatedly reconstructing context, handoffs, and status.**

Once supervised operation is stable and measured, the stronger autopilot and cross-project-learning vision can be introduced safely as progressively earned capabilities.

## References

[1]: file:///home/ubuntu/upload/AutoForge_Project_Overview.md "AutoForge Project Overview, supplied by the user"
[2]: file:///home/ubuntu/upload/AutoForge_Strategic_Vision.md "AutoForge Strategic Vision, supplied by the user"
[3]: file:///home/ubuntu/upload/REPO.md "Repository snapshot: CLI, quickstart, configuration, and current command dispatcher; notably lines 22072–23492"
[4]: file:///home/ubuntu/upload/REPO.md "Repository snapshot: agent roles, prompt controls, boundaries, and autonomy guide; notably lines 21692–22023 and 3142–3810"
[5]: file:///home/ubuntu/upload/REPO.md "Repository snapshot: context manifest and quality-gate declarations; notably lines 5590–5714"
[6]: file:///home/ubuntu/upload/REPO.md "Repository snapshot: runtime coordinator, adapters, telemetry, validators, and implementation plan; notably lines 3812–5164 and 8738–8836"
[7]: file:///home/ubuntu/upload/REPO.md "Repository snapshot: session policy, enforcement rules, and execution policies; notably lines 718–1216"
