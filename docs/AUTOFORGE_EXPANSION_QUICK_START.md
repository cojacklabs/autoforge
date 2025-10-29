# AutoForge Expansion Quick Start Guide

**One-page reference for understanding and implementing the autopilot + training framework.**

---

## What's New? (3 Document Summary)

| Document | What It Does | Key Contribution |
|----------|-------------|------------------|
| **AUTOFORGE_AUTOPILOT_ENGINE.md** | Orchestrates agents autonomously with 4 autonomy levels (0=manual → 3=full_adaptive) | Enables 24/7 development without human blocking |
| **AUTOFORGE_AI_MODEL_TRAINING.md** | Collects data from every execution and improves prompts/recipes continuously | System gets smarter with each project |
| **AUTOFORGE_EXPANSION_SYNTHESIS.md** | Ties everything together; provides implementation roadmap and success metrics | Big-picture vision + quarterly goals |

---

## 4 Autonomy Levels Explained

```
Level 0: MANUAL
│ Human approves every decision
│ Use case: Complex, high-risk, first projects
│ Time: 3+ hours human oversight per project
│
Level 1: SUPERVISED ← START HERE
│ Agents run autonomously
│ Pause only for: deployments, security exceptions, external integrations
│ Use case: Standard projects, proven recipes
│ Time: 45 min human oversight per project
│
Level 2: FULL AUTOPILOT
│ Agents make ALL decisions autonomously
│ Humans review only post-deployment (async, no blocking)
│ Use case: Proven recipes, mature teams
│ Time: 10 min human oversight per project
│
Level 3: ADAPTIVE AUTOPILOT
│ Agents run autonomously AND improve themselves
│ Humans review model training changes only
│ Use case: Continuous deployment, feedback-driven evolution
│ Time: 5 min human oversight per project
```

---

## Implementation Timeline (8 Weeks)

```
Week 1-2: FOUNDATION (22 hours)
├─ Define orchestration state machine
├─ Extend ACTIVE_MEMORY for decisions/assumptions
├─ Create agent autonomy matrix
└─ Build quality gate auto-fix logic
Result: Agents can run stages without manual triggering

Week 3-4: AUTOPILOT (32 hours)
├─ Implement orchestration runner
├─ Build decision executor
├─ Add session memory manager (resume capability)
└─ CLI: npx autoforge autopilot --level 1
Result: 80% of projects complete on L1 without escalation

Week 5-6: TRAINING (42 hours)
├─ Build training data collector (every gate, every decision)
├─ Implement pattern extraction (what works/doesn't)
├─ Create suggestion engine (output prompt improvements)
└─ CLI: npx autoforge train --from-last-N-projects 10
Result: Gate success 75% → 90%; prompts measurably improve

Week 7-8: POLISH (18 hours)
├─ End-to-end tests (idea → shipping code on L2)
├─ Documentation & guides
├─ Metrics dashboard
└─ Sample recipes with evolution history
Result: System is production-ready; team is trained

TOTAL: 114 hours (can be 1 engineer/4 months OR 3 engineers/4 weeks)
```

---

## What Gets Better (Evidence from Expansion)

| Metric | Before | After (Q1) | After (Q2) | After (Q3) |
|--------|--------|-----------|-----------|-----------|
| **Gate Success Rate** | 75% | 80% | 90% | 95%+ |
| **Avg Retries per Gate** | 1.2 | 0.9 | 0.6 | 0.3 |
| **Project Time** | 8 hours | 7 hours | 6 hours | 4.5 hours |
| **Human Involvement** | 3 hours | 45 min | 15 min | 5 min |
| **Escalation Rate** | 25% | 15% | 8% | 3% |
| **Token Cost/Project** | $45 | $42 | $38 | $28 |
| **Security Issues Post-Launch** | 3-5 | 1-2 | 0-1 | 0 |

**Why:** With each project, the system learns. Prompts get better. Recipes get faster. Agents become smarter.

---

## Key Architectural Innovations

### 1. Orchestration State Machine

```yaml
Defines exactly how agents move through SDLC:
├─ What are the states? (idea_intake → design → engineering → testing → deploy)
├─ What are transitions? (on success, gate_fail, ambiguity, blocker)
├─ What decisions at each state? (who decides, authority matrix)
├─ What escalations? (when to pause for human review)
└─ What recovery? (auto-retry with refined prompts)

Result: Deterministic workflow; no manual state management
```

### 2. Agent Autonomy Matrix

```yaml
Specifies what each agent can decide without human approval:
┌─ Product Manager
│  Can decide: feature priority, acceptance criteria
│  Cannot decide: scope expansion, budget adjustment
├─ Architect
│  Can decide: tech stack, design conflicts
│  Cannot decide: new external service, breaking schema change
├─ Engineer
│  Can decide: refactoring, library version
│  Cannot decide: breaking API change, new dependency
├─ Security Engineer
│  Can decide: vulnerability classification, remediation
│  Cannot decide: security exception (policy override)
└─ DevOps
   Can decide: deployment strategy, rollback
   Cannot decide: production deployment (L<2), infra change

Result: Clear boundaries prevent both over-caution and recklessness
```

### 3. Quality Gate Auto-Correction

```yaml
When gate fails:
├─ Attempt 1: Run gate → FAIL
├─ Attempt 2: Refine prompt with failure context → Re-execute → FAIL
├─ Attempt 3: Refine again with more aggressive constraints → Re-execute → PASS
│
If after 3 attempts still failing:
├─ Log: why did it fail? (evidence for training loop)
└─ Escalate: to human with full context + suggestion

Result: 80% of gate failures auto-resolved; escalations are exceptions
```

### 4. Decision Conflict Resolution via Arbiters

```yaml
When agents disagree:
├─ If security vs other: SECURITY AGENT WINS (always)
├─ If architect vs engineer: ARCHITECT DECIDES (contract is law)
├─ If QA vs engineer: QA DECIDES (quality is non-negotiable)
├─ If product vs architect: PRODUCT DECIDES (business needs come first)
└─ If unresolvable: ESCALATE to human with both perspectives

Result: Clear arbiter pattern prevents decision paralysis
```

### 5. Multi-Session Memory

```yaml
Projects can pause/resume; decisions persist:
├─ ACTIVE_MEMORY.yaml tracks: [decisions, assumptions, blockers, constraints]
├─ Session scratch: [intermediate work, failed attempts, reasoning]
├─ Project history: [what_worked, what_failed, lessons_learned]
└─ Vector store: [successful_patterns from prior projects]

When resuming:
├─ Load ACTIVE_MEMORY
├─ Validate all assumptions still hold
├─ If assumptions invalid: re-plan affected stages
└─ Continue from last checkpoint

Result: No context loss between sessions; projects can span multiple days
```

### 6. Closed-Loop Learning

```yaml
Every execution feeds training pipeline:
├─ Gate evaluations → Pattern extraction → Improve prompts
├─ Agent decisions → Human feedback → Measure if override was right → Retrain
├─ Downstream feedback → Handoff improvement → Measure satisfaction
├─ Token analysis → Optimize prompts → Deploy more efficient version
├─ Recipe tracking → Evolve recipes → Deploy improved versions
└─ Quality regression → Investigate root cause → Prevent future regression

Result: System gets smarter with each project; metrics trend upward
```

---

## Sample Metrics Dashboard (Quarterly)

```
AUTOFORGE TRAINING METRICS (Q1 2026)
─────────────────────────────────────

Projects Completed: 25
Autonomous Success Rate: 85% (no escalation)
Average Project Time: 6.5 hours

PROMPT IMPROVEMENTS DEPLOYED:
├─ architect.v1.0 → v2.0 (+18% success rate)
├─ engineer.v1.0 → v1.1 (+8% success rate)
├─ qa_engineer.v1.0 → v2.0 (+22% success rate)
└─ security_engineer.v1.0 → v1.2 (+12% success rate)

RECIPE IMPROVEMENTS:
├─ gis_investment: v1.0 → v2.0 (67% → 95% success rate)
├─ mobile_auth: v1.0 → v1.1 (78% → 88% success rate)
└─ web_saas: v1.0 → v1.0 (82% → no change; keep as-is)

TOP LEARNING SIGNALS:
├─ "API contracts missing error code taxonomy" (resolved in architect.v2.0)
├─ "QA needed mobile-specific edge cases" (resolved in qa_engineer.v2.0)
├─ "Parallel execution of UI/UX + architecture saves 2h" (recipe updated)
└─ "Token efficiency improved 18% with constraint pruning" (deployed)

COST SAVINGS:
├─ Token cost/project: $45 → $38 (-15%)
├─ Human overhead/project: 3h → 45m (-75%)
├─ Time to completion: 8h → 6.5h (-19%)

RECOMMENDED NEXT ACTIONS:
├─ Deploy mobile_auth.v1.1 as default for mobile projects
├─ Investigate why fintech domain still has 2 critical security issues
├─ Create new recipe for healthcare_platform (discover pattern)
└─ A/B test architect.v2.0 vs v2.1 (test confidence calibration change)
```

---

## Decision Tree: Which Level to Start With?

```
Question 1: Is this your first time using AutoForge?
├─ Yes → Start with Level 0 or 1 (build confidence)
└─ No → Go to Question 2

Question 2: Do you trust AI agent decision-making?
├─ Uncertain/No → Level 1 (supervised with approvals)
├─ Yes → Go to Question 3
└─ Very confident → Level 2

Question 3: Is this a critical/high-risk project?
├─ Yes → Level 1 (extra caution)
└─ No → Level 2

Question 4: Do you want continuous improvement (training)?
├─ Yes → Level 3 (with training loop active)
└─ No → Level 2 (autopilot but static prompts)

EXAMPLES:
├─ First-time user, startup idea → Level 1 (safe, learn system)
├─ Proven recipe, trusted team → Level 2 (full automation)
├─ Enterprise, high-risk deploy → Level 1 (extra oversight)
└─ Continuous deployment, feedback-driven → Level 3 (self-improving)
```

---

## Checklist: Ready to Implement?

### Before You Start

- [ ] Review AUTOFORGE_AUTOPILOT_ENGINE.md (understand state machine)
- [ ] Review AUTOFORGE_AI_MODEL_TRAINING.md (understand feedback loops)
- [ ] Review AUTOFORGE_EXPANSION_SYNTHESIS.md (understand big picture)
- [ ] Decide autonomy levels for your organization
- [ ] Draft autonomy policies in `ai/agents_autonomy.yaml`
- [ ] Assign engineers to Phase 1
- [ ] Schedule Phase 1 kickoff meeting

### Phase 1 Completion Criteria

- [ ] Orchestration state machine implemented and tested
- [ ] ACTIVE_MEMORY extended with decision tracking
- [ ] Agent autonomy matrix enforced in code
- [ ] Quality gate auto-fix working (retries + escalation)
- [ ] 2-3 test projects run successfully with new infrastructure
- [ ] All Phase 1 changes committed and documented

### Phase 2 Completion Criteria

- [ ] Orchestration runner fully implemented
- [ ] Decision executor enforcing autonomy matrix
- [ ] Session memory manager (resume capability)
- [ ] `npx autoforge autopilot --level 1` command working
- [ ] 5-10 projects completed on L1 with < 15% escalation rate
- [ ] Team confidence in autonomous decisions

### Phase 3 Completion Criteria

- [ ] Training data collection hooks in place
- [ ] Pattern extraction pipeline working
- [ ] First 3 prompt improvements identified and tested
- [ ] Suggestion engine producing actionable recommendations
- [ ] `npx autoforge train` command working
- [ ] Metrics dashboard showing improvements

---

## Common Questions

**Q: Can we skip training pipeline and just use autopilot?**
A: Yes! Autopilot gives huge value alone. Training loop is optional bonus (but recommended).

**Q: What if we're worried about autonomous decisions?**
A: Start Level 1 (supervised); move to Level 2 as confidence grows.

**Q: How do we prevent breaking production?**
A: Safety guardrails baked in: never deploy without human (L<2), never override security, audit trail of all decisions.

**Q: What's the investment?**
A: ~114 engineering hours (3-4 weeks at 1 eng; 1 week at 3 engineers). ROI: saves 2.5 hours per project × unlimited projects.

**Q: Can we customize autonomy rules?**
A: Absolutely. Define in `ai/agents_autonomy.yaml` what YOUR organization needs.

---

## Get Started NOW

### Step 1: Read (30 min)
- Read AUTOFORGE_EXPANSION_SYNTHESIS.md (executive summary)
- Skim AUTOFORGE_AUTOPILOT_ENGINE.md sections 1-3 (understanding)
- Skim AUTOFORGE_AI_MODEL_TRAINING.md section 1 (overview)

### Step 2: Plan (1 hour)
- Schedule Phase 1 kickoff
- Assign engineers
- Draft autonomy policies for your org
- Set quarterly success metrics

### Step 3: Build (8 weeks)
- Phase 1: State machine + memory + gates (weeks 1-2)
- Phase 2: Orchestration + autopilot (weeks 3-4)
- Phase 3: Training pipeline (weeks 5-6)
- Phase 4: Polish + docs + tests (weeks 7-8)

### Step 4: Deploy (Ongoing)
- Run L1 autopilot on production projects
- Collect feedback and training data
- Deploy prompt improvements
- Evolve recipes
- Move to L2/L3 as confidence grows

---

## What Success Looks Like

**Week 8 (End of Implementation):**
```
You ask: "Build a GIS investment tracker for fintech"
System: Starts automatically on L1_autopilot
8 hours later: Product ready for QA
You review: Everything looks good
System: Ships, monitors, succeeds
Total your time: 30 minutes (the review)
```

**Month 3 (After 10+ projects):**
```
System has learned from all prior projects
Prompts are 30% more efficient
Recipes ship 40% faster
Gate success rate: 95%
You ask: "Build mobile auth"
System: Completes in 3 hours instead of 8
Total your time: 5 minutes
```

**Month 6 (After 25+ projects):**
```
System is running on L2_autopilot (full autonomous)
You sleep
Projects ship while you sleep
Morning: Review what shipped, approve if needed
Metrics show: 98% quality, 0 critical bugs
System is self-improving; gets smarter every project
```

---

**Questions?** Check the detailed documents or review the Expansion Synthesis for comprehensive examples.

**Ready?** Start with Phase 1. You've got this!

---

**Document Version:** 1.0
**Quick Reference for:** AUTOFORGE_AUTOPILOT_ENGINE.md, AUTOFORGE_AI_MODEL_TRAINING.md, AUTOFORGE_EXPANSION_SYNTHESIS.md
**Date:** 2025-10-29
