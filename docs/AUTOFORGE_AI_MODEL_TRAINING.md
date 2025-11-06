# AutoForge AI Model Training Framework

**Version:** 1.0
**Purpose:** Systematically improve AI agent performance through continuous learning, feedback loops, and prompt/recipe evolution.

---

## 1. Overview: Why Train Your Models?

Traditional SDLC relies on static prompts. AutoForge inverts this: **every project teaches the system.**

### 1.1 What Gets Better?

| What                             | Before Training | After 10 Projects | After 50 Projects |
| -------------------------------- | --------------- | ----------------- | ----------------- |
| Gate failure rate                | 25%             | 8%                | 2%                |
| Avg retries per task             | 1.8             | 0.6               | 0.3               |
| Time to first working prototype  | 4 hours         | 2 hours           | 45 minutes        |
| Token efficiency (tokens/LOC)    | 450             | 350               | 200               |
| Security issues found but missed | 8%              | 2%                | 0.5%              |
| Autonomous decision confidence   | 60%             | 78%               | 88%               |

---

## 2. Training Data Collection

### 2.1 What to Collect

```yaml
training_data_schema:
  project_metadata:
    project_id: string
    created_at: timestamp
    completed_at: timestamp
    recipe: string (e.g., "gis_investment_v1")
    client_domain: enum [saas, fintech, healthtech, ecommerce, analytics, other]
    team_size: int
    autonomy_level_used: [0, 1, 2, 3]

  stage_execution:
    stage_id: string (e.g., "architecture")
    agent_role: string (e.g., "architect")
    agent_model: string (e.g., "claude-3-5-sonnet")
    timestamp_start: timestamp
    timestamp_end: timestamp
    duration_seconds: int

  prompt_and_execution:
    prompt_version: string (e.g., "architect.v2.3")
    prompt_template: string (stored for future analysis)
    system_context: {
      prior_decisions: [string],
      constraints: [string],
      acceptance_criteria: [string]
    }
    input_tokens: int
    output_tokens: int
    total_cost: float
    model_temperature: float
    output_raw: string (entire agent output)

  gate_validation:
    gate_id: string (e.g., "api_contract_present")
    validation_timestamp: timestamp
    validation_result: enum [pass, fail, ambiguous]
    validation_reason: string
    retry_attempt: int (1, 2, 3, ...)
    auto_fix_applied: bool
    auto_fix_strategy: string if applied
    auto_fix_success: bool if applied
    human_override: bool
    human_decision: string if override

  quality_signals:
    downstream_agent_feedback: [
      {
        reporting_agent: string (e.g., "engineer"),
        feedback: string (e.g., "API contract missing error code definitions"),
        severity: enum [critical, major, minor],
        timestamp: timestamp
      }
    ]
    test_results: {
      tests_written_by_qa_agent: int,
      tests_executed: int,
      tests_passed: int,
      test_coverage_percent: float,
      flaky_tests: int
    }
    security_scan: {
      vulnerabilities_found: int,
      critical: int,
      major: int,
      minor: int,
      false_positives: int
    }
    performance_metrics: {
      page_load_time_ms: float,
      endpoint_latency_ms: float,
      memory_usage_mb: float,
      within_slo: bool
    }

  human_feedback:
    approval_decisions: [
      {
        decision_id: string,
        decision_type: enum [feature_priority, architecture_choice, tech_stack, risk_acceptance],
        agent_recommendation: string,
        human_decision: string,
        human_reasoning: string,
        decision_aligned: bool (did agent guess right?),
        timestamp: timestamp
      }
    ]
    post_project_survey: {
      agent_helpfulness_overall: 1-5,
      agent_decision_quality: 1-5,
      gate_frustration_level: 1-5,
      would_use_again: bool,
      comments: string,
      suggestions: string
    }
    escalation_events: [
      {
        reason: string,
        stage: string,
        time_spent_escalated: seconds,
        resolution: string,
        human_effort_required: 1-5 (effort scale),
        avoidable: bool
      }
    ]

  outcome_metrics:
    project_success: enum [shipped, alpha_ready, blocked, cancelled]
    time_to_completion: seconds
    token_cost_total: float
    quality_score: 0-100 (aggregate of test_coverage, security, perf, architecture_quality)
    delivery_speed_rank: percentile (vs prior projects of same recipe)
    agent_decisions_overridden: int
    critical_errors_post_deployment: int
```

### 2.2 Collection Points

```yaml
collection_triggers:
  on_gate_evaluation:
    frequency: every_gate_check
    data: [gate_id, result, retry_attempt, auto_fix_applied, success]
    sample_size: 100% (always collect)

  on_agent_stage_completion:
    frequency: every_stage_completion
    data:
      [stage_id, agent_model, prompt_version, duration, tokens, quality_signals]
    sample_size: 100%

  on_human_approval:
    frequency: every_approval_decision
    data: [decision_type, recommendation, human_decision, reasoning, aligned?]
    sample_size: 100%

  on_downstream_agent_feedback:
    frequency: when_agent_rejects_prior_output
    data: [prior_agent, next_agent, feedback, severity, timestamp]
    sample_size: 100%

  on_test_execution:
    frequency: after_qa_stage
    data: [tests_written, passed, coverage, flaky_test_count]
    sample_size: 100%

  on_security_scan:
    frequency: after_security_stage
    data: [vulnerabilities, severity_breakdown, false_positives]
    sample_size: 100%

  on_project_completion:
    frequency: once_per_project
    data: [success_outcome, wall_clock_time, token_cost, quality_score]
    sample_size: 100%

  on_human_survey:
    frequency: post_project (optional but encouraged)
    data: [helpfulness, decision_quality, gate_frustration, comments]
    sample_size: 80% (some projects skip)
```

### 2.3 Storage

```bash
# Directory structure
.autoforge/ai/training_data/
├── raw/
│   ├── 2025-10/
│   │   ├── project_ABC123_execution.jsonl
│   │   ├── project_ABC123_gates.jsonl
│   │   ├── project_ABC123_feedback.jsonl
│   │   └── project_ABC123_summary.json
│   ├── 2025-09/
│   └── ...
├── labeled/
│   ├── gates_labeled.jsonl (human + auto-labeled gate results)
│   ├── decisions_labeled.jsonl (human decisions + auto-alignment)
│   └── outputs_quality_scored.jsonl (manual quality ratings)
├── aggregated/
│   ├── agent_performance_by_role.json
│   ├── recipe_success_rates.json
│   ├── prompt_version_metrics.json
│   └── trend_analysis.json
└── reports/
    ├── 2025-10-learning_report.md
    ├── 2025-09-learning_report.md
    └── metrics_trends.json

# File format: JSONL (one JSON object per line)
# Example entry:
{
  "project_id": "ABC123",
  "stage": "architecture",
  "agent_role": "architect",
  "agent_model": "claude-3-5-sonnet",
  "gate_id": "api_contract_present",
  "gate_result": "fail",
  "gate_result_reason": "File does not exist at api/openapi.yaml",
  "retry_attempt": 1,
  "auto_fix_applied": true,
  "auto_fix_strategy": "architect_drafts_stub",
  "auto_fix_success": true,
  "downstream_feedback": null,
  "timestamp": "2025-10-29T14:30:00Z"
}
```

---

## 3. Data Labeling and Quality Assessment

### 3.1 Automatic Labeling

```yaml
automatic_labeling_rules:
  gate_result_label:
    rule: |
      IF gate_result == "pass" THEN quality = "excellent"
      ELSE IF retry_attempt < max_retries AND auto_fix_success THEN quality = "good"
      ELSE IF escalated_to_human AND human_resolved THEN quality = "acceptable"
      ELSE quality = "poor"

  agent_decision_label:
    rule: |
      IF human_decision == agent_recommendation THEN alignment = "correct"
      ELSE IF human_decision_in_nearby_options THEN alignment = "reasonable"
      ELSE alignment = "incorrect"
      confidence = human_confidence_rating or 50 (default)

  prompt_effectiveness_label:
    rule: |
      success_rate_for_version = count(pass) / count(total)
      retry_rate = avg(retry_attempts) for_all_uses_of_version
      IF success_rate > 90% AND retry_rate < 1.0 THEN effectiveness = "high"
      ELSE IF success_rate > 75% THEN effectiveness = "medium"
      ELSE effectiveness = "low"

  output_quality_label:
    rule: |
      quality_score = (test_coverage * 0.25) +
                      (security_clean * 0.30) +
                      (perf_within_slo * 0.20) +
                      (no_major_rework * 0.25)
      IF quality_score >= 85 THEN output = "production_ready"
      ELSE IF quality_score >= 70 THEN output = "needs_minor_fixes"
      ELSE output = "needs_rework"
```

### 3.2 Manual Quality Review

```yaml
manual_review_process:
  trigger:
    - random_sample: 5% of all outputs
    - all_escalations: review_why_escalated
    - low_automatic_score: outputs < 70
    - new_prompt_versions: first_10_usages

  review_checklist:
    correctness:
      - Does output match requirements? (yes/no)
      - Are edge cases considered? (yes/no/partially)
      - Is output complete or stub? (complete/stub/incomplete)
    clarity:
      - Is output understandable by next agent? (yes/no/mostly)
      - Are assumptions documented? (yes/no)
    quality:
      - Would this pass code review? (yes/no/minor_fixes)
      - Are there obvious improvements? (yes/no)
    efficiency:
      - Did agent waste tokens? (yes/no)
      - Could prompt be tighter? (yes/no)

  reviewer_feedback:
    overall_rating: 1-5
    comments: string
    suggested_improvements: string
    learning_signal: string (e.g., "Agent didn't follow constraint about error handling; tighten prompt")

  storage: .autoforge/ai/training_data/labeled/manual_reviews.jsonl
```

---

## 4. Learning Patterns

### 4.1 Pattern Categories and Detection

```yaml
learning_patterns:
  pattern_1_gate_failure_root_causes:
    description: Why do specific gates fail repeatedly?
    detection:
      trigger: gate_failure_rate_per_gate > 10%
      analysis: |
        GROUP gate_failures BY [gate_id, failure_reason]
        RANK BY frequency
        EXTRACT top_3_failure_reasons
    example_findings:
      - "api_contract_present fails 40% for missing error definitions"
        → Architect prompt lacks error taxonomy guidance
      - "test_coverage fails 30% due to insufficient edge cases"
        → QA prompt needs template for edge case discovery
    action: [improve_prompt, add_examples, clarify_constraint]

  pattern_2_retry_hotspots:
    description: Which agent roles retry most often?
    detection:
      trigger: any_agent_role with avg_retries > 1.0
      analysis: |
        GROUP executions BY agent_role
        CALCULATE avg_retries_per_stage
        IDENTIFY roles_above_threshold
    example_findings:
      - "Architect: 1.8 avg retries vs Engineer: 0.6"
        → Architect prompt too vague; needs clearer constraints
      - "QA on mobile platform: 2.1 retries vs web: 0.8"
        → Mobile-specific testing scenarios not covered in prompt
    action: [role_specific_prompt_improvement, add_platform_coverage]

  pattern_3_successful_agent_combinations:
    description: Which agent handoffs work smoothest?
    detection:
      trigger: analyze all multi_agent sequences
      analysis: |
        FOR EACH agent_pair (A → B)
          CALCULATE: gate_pass_rate_after_handoff
          EXTRACT: information_quality_score (upstream_quality / downstream_retries)
        RANK pairs by smoothness
    example_findings:
      - "Architect → Engineer has 95% success vs Architect → QA: 70%"
        → Engineer has better error recovery; adjust QA escalation threshold
      - "ProductManager → Architect (if_prd_detailed) = 98% success"
        → Detailed PRD enables better architecture; prioritize PM work
    action: [adjust_stage_ordering, improve_handoff_templates, prioritize_dependencies]

  pattern_4_human_override_frequency:
    description: Which decisions get overridden by humans?
    detection:
      trigger: track all human_approval decisions
      analysis: |
        GROUP decisions BY [decision_type, agent_role]
        CALCULATE: override_rate = human_overrides / total_decisions
        IDENTIFY: decisions_overridden_>50%
    example_findings:
      - "Engineer feature prioritization overridden 60% of time"
        → Agent doesn't understand business context; add customer_input to prompt
      - "Security exception approvals: 100% override (always approved by human)"
        → Threshold for escalation too conservative; adjust autonomy_level
    action: [add_context_to_prompt, adjust_escalation_thresholds, reduce_manual_gates]

  pattern_5_token_efficiency:
    description: Which prompts waste tokens?
    detection:
      trigger: analyze input_tokens + output_tokens per task
      analysis: |
        FOR EACH prompt_version
          CALCULATE: avg_tokens_per_successful_output
          IDENTIFY: versions with >20% higher token_usage
        CORRELATE with quality_score
    example_findings:
      - "Architect v1.5: 8k avg tokens; v2.0: 6k avg tokens, same output quality"
        → v2.0 prompt is more efficient; gradually deprecate v1.5
      - "Engineer prompt average 12k input tokens but only uses 3k"
        → Provide less context upfront; load context on-demand
    action: [replace_verbose_prompts, optimize_context_loading, reduce_redundancy]

  pattern_6_recipe_effectiveness:
    description: Which recipe+domain combinations ship fastest?
    detection:
      trigger: after every 10 projects, aggregate recipe performance
      analysis: |
        GROUP projects BY [recipe, domain, team_size]
        CALCULATE: [time_to_completion, quality_score, token_cost, success_rate]
        COMPARE: baseline_recipe vs improved_recipe
    example_findings:
      - "gis_investment recipe on fintech domain: 40% faster than generic web_app recipe"
        → Recommend gis_investment for any real_estate/fintech project
      - "mobile_auth with Firebase: 25% lower cost than with Supabase"
        → Prefer Firebase in auth recipe for cost savings
    action: [promote_winning_recipes, deprecate_slow_recipes, create_domain_variants]

  pattern_7_confidence_calibration:
    description: When does agent confidence match actual success?
    detection:
      trigger: agent outputs confidence score; compare to actual outcome
      analysis: |
        FOR EACH [confidence_bucket: 0-20, 20-40, 40-60, 60-80, 80-100]
          CALCULATE: actual_success_rate_for_bucket
          PLOT: confidence vs actual_success (should be monotonic)
    example_findings:
      - "Architect confidence 80-100%: 92% actual success (good calibration)"
      - "Engineer confidence 60-80%: 55% actual success (overconfident)"
        → Engineer prompt should be more conservative about complex refactors
    action: [adjust_decision_thresholds, add_uncertainty_vocabulary, retrain_confidence_heuristics]

  pattern_8_error_recovery_strategies:
    description: Which auto_fix strategies work best?
    detection:
      trigger: every time auto_fix is applied
      analysis: |
        FOR EACH auto_fix_strategy
          CALCULATE: success_rate = auto_fix_success / attempts
          RANK by success_rate
    example_findings:
      - "architect_drafts_stub: 85% success rate"
      - "engineer_refactors_existing: 60% success rate"
        → Prefer stubs over refactors; add to runbook
    action: [promote_high_success_strategies, deprecate_low_success_strategies, train_agents_on_best_practices]
```

---

## 5. Feedback Loop Integration

### 5.1 Closed-Loop Learning

```yaml
feedback_loop_system:
  loop_1_gate_failures:
    trigger: gate fails 3+ times with same root cause
    feedback: "Architect prompt lacks error taxonomy guidance; 40% of API contract failures"
    action:
      - extract_failure_examples
      - propose_prompt_improvement:
          old_prompt: |
            "Generate OpenAPI contract with models, endpoints, and responses."
          new_prompt: |
            "Generate OpenAPI contract with:
             1. Data models with types and validation rules
             2. All endpoints with request/response schemas
             3. Error responses: define error codes, messages, status codes for each endpoint
             4. Example: endpoint GET /parcels returns 200 {parcel}, 400 (validation error), 404 (not found), 500 (server error)"
      - run_A_B_test: [new_prompt vs old_prompt on_next_5_projects]
      - measure: [gate_success_rate, retry_rate, human_override_rate]
      - if_winning: commit_new_prompt_as_default

  loop_2_human_overrides:
    trigger: human overrides agent decision >= 50% of time
    feedback: "Engineer doesn't understand business context for feature prioritization"
    action:
      - analyze_override_examples
      - propose_context_enrichment:
          missing_context: [customer_impact, revenue_impact, technical_risk]
          solution: add_these_inputs_to_agent_prompt
      - retest: engineer_makes_same_decisions_on_new_context
      - if_improved: update_engineer_prompt_with_new_context

  loop_3_downstream_feedback:
    trigger: next_agent rejects prior_agent output
    feedback_chain: "Engineer: 'API contract incomplete (missing error codes)' → Architect gets feedback"
    action:
      - log_which_agent_provides_best_feedback
      - create_feedback_message:
          from: engineer
          to: architect
          observation: "Your API contracts are missing error code definitions"
          impact: "I have to spend 30 min reverse-engineering what errors this endpoint can return"
          suggestion: "Add error response section to contract template"
      - architect_updates_prompt with engineer_feedback
      - measure: downstream_satisfaction_with_architect_outputs

  loop_4_quality_regression:
    trigger: output_quality_score drops > 10% vs prior_project
    feedback: "QA coverage dropped 15%; investigate agent change or prompt regression"
    action:
      - identify_root_cause:
          [new_agent_model, updated_prompt, harder_domain, team_change]
      - if_caused_by_prompt_change: revert_or_improve
      - if_caused_by_agent_model: compare_model_performance
      - if_caused_by_domain: flag_domain_specific_gap and add_training_data
      - publish_finding: "Model X underperforms on domain Y"

  loop_5_token_efficiency:
    trigger: prompt_version uses > 20% more tokens than previous version
    feedback: "New prompt is more verbose but doesn't improve output quality"
    action:
      - compare_output_quality: [old_version, new_version]
      - if_quality_same: optimize_prompt_for_brevity
      - if_quality_better: accept_higher_cost or_seek_compromise
      - store_insight: "Constraint X doesn't improve output; remove from future versions"

  loop_6_autonomy_calibration:
    trigger: escalation_rate or override_rate changes significantly
    feedback: "Agents are becoming more confident but overriding too often"
    action:
      - lower_autonomy_decision_threshold: increase human oversight
      - or_repattern_agent_prompts: add humility and uncertainty
      - test_on_next_3_projects
      - measure: escalation_rate, success_rate, human_satisfaction

  measurement_strategy:
    always_measure:
      - does_change_reduce_target_problem? (e.g., gate failure rate)
      - does_change_degrade_other_metrics? (token_cost, time_to_completion)
      - is_change_worth_deploying? (cost_benefit analysis)
    A_B_test_protocol:
      - control_group: 50% of next projects use old_prompt
      - treatment_group: 50% use new_prompt
      - sample_size: min 5 projects per group
      - statistical_significance: p < 0.05
      - winner_declared: control or treatment after_sample_complete
      - deploy: move winning_variant to default
    deployment_strategy:
      - small_rollout: 25% of projects use new_version
      - monitor_for: regressions, cost, quality
      - if_clean: 100% rollout
      - if_issue: rollback to previous version
```

---

## 6. Prompt Improvement Workflow

### 6.1 Suggestion Engine

```yaml
prompt_improvement_suggester:
  input_data:
    gate_failures: [root_cause, frequency, examples]
    retry_patterns: [agent_role, avg_retries, scenarios_where_high]
    human_overrides: [decision_type, override_rate, reasoning]
    downstream_feedback: [feedback_list, severity, patterns]
    token_analysis: [average_tokens, efficiency_score, vs_baseline]

  suggestion_rules:
    rule_1_constraint_clarity:
      pattern: gate_fails_due_to_missing_detail
      suggestion_template: |
        "Add explicit constraint to {{agent_role}} prompt:
         OLD: 'Generate API contract with endpoints and schemas.'
         NEW: 'Generate API contract with:
              - All error responses (define status_code, error_code, message)
              - Example: GET /foo returns 200, 400, 404, 500 with specific error reasons'
         Rationale: {{agent}} missed error responses in {{failure_count}} attempts"

    rule_2_example_addition:
      pattern: agent_struggles_with_complex_pattern
      suggestion_template: |
        "Add example to {{agent_role}} prompt demonstrating {{pattern}}:
         Example input: {{real_world_example}}
         Expected output: {{what_correct_output_looks_like}}
         Why: {{agent}} failed {{failure_count}} times; example would guide behavior"

    rule_3_context_enrichment:
      pattern: human_overrides_agent_decision_due_to_missing_context
      suggestion_template: |
        "Provide {{missing_context}} to {{agent_role}} prompt:
         Add to system context: {{context_description}}
         Why: {{agent}} lacks {{context}} needed for decision type '{{decision_type}}'"

    rule_4_decision_framework:
      pattern: agent_decision_quality_low_and_unstructured
      suggestion_template: |
        "Add decision framework to {{agent_role}} prompt:
         Current: Agent makes ad_hoc decisions
         Proposed: Structure decision as [option_1, option_2, option_3] + pick_best + explain_why
         Why: Structured reasoning improves override_rate from {{old_rate}}% to {{expected_new_rate}}%"

    rule_5_constraint_removal:
      pattern: constraint_added_but_no_quality_improvement
      suggestion_template: |
        "Remove or loosen constraint from {{agent_role}} prompt:
         OLD: {{old_constraint}}
         Reason: Constraint was added to address {{original_problem}},
         but {{original_problem}} is no longer occurring (improved from {{old_failure_rate}}% to {{new_failure_rate}}).
         Benefit: Reduces prompt length by {{token_savings}}; no quality regression."

    rule_6_role_handoff_improvement:
      pattern: agent_A_→_agent_B_has_low_success_rate
      suggestion_template: |
        "Improve {{agent_A}} → {{agent_B}} handoff:
         Problem: {{agent_B}} rejects {{agent_A}} output {{rejection_rate}}% of time
         Reason: {{agent_A}} is missing [{{required_info_list}}]
         Solution: Ask {{agent_A}} to provide [{{required_info_list}}] in output
         Add to {{agent_A}} prompt: {{specific_instruction}}"

  suggestion_output:
    format: yaml
    structure:
      - suggestion_id: "SUG-2025-10-001"
        agent_role: "architect"
        suggestion_type: "constraint_clarity"
        confidence: 0.85
        evidence:
          - gate_failure_rate: 0.40
          - retry_count: 127
          - root_cause: "Missing error taxonomy"
        proposed_change:
          prompt_file: "ai/prompts/architect.yaml"
          section: "API_contract_generation"
          old_text: "..."
          new_text: "..."
          rationale: "..."
        expected_impact:
          gate_success_improvement: 0.30
          retry_reduction: 0.40
          token_efficiency: "neutral"
        implementation_effort: "low"
        risk: "low"
```

### 6.2 Prompt Evolution Tracking

```yaml
prompt_evolution:
  versioning:
    format: "{{role}}.v{{major}}.{{minor}}"
    example: "architect.v2.3"
    changelog: "ai/prompts/CHANGELOG.md"

  metrics_per_version:
    architect.v1.0:
      gate_success_rate: 0.75
      avg_retries: 1.2
      avg_tokens: 8200
      human_override_rate: 0.35
      deployed_from: "2025-10-01"
      deployed_to: "2025-10-15"
      projects: 5
    architect.v1.1:
      changes: ["Added error taxonomy constraint"]
      gate_success_rate: 0.82
      avg_retries: 0.95
      avg_tokens: 8100
      human_override_rate: 0.32
      improvement_vs_prior: [gate_success +7%, retries -21%, override -9%]

  comparison_view:
    best_prompt_for: [domain, complexity_level, team_size]
    example: |
      "For fintech projects with 5+ engineers:
       Use architect.v2.3 (98% gate success)
       vs engineer.v3.1 (92% gate success for code generation)"

  deprecation_policy:
    retire_when:
      [newer_version_has_higher_success_rate, no_active_projects_use_it]
    archive_location: ".autoforge/ai/prompts/deprecated/"
    retention_duration: "3 months after last_use"
```

---

## 7. Recipe Evolution

### 7.1 Recipe Versioning and Improvement

```yaml
recipe_evolution:
  example_gis_investment_v1:
    created: "2025-10-01"
    projects: 3
    success_rate: 0.67
    avg_time_to_completion: "8h 30m"
    metrics:
      test_coverage: 0.82
      security_issues: 2_critical
      perf_slo_met: false
    feedback:
      "Process was slow because architecture stage blocked too long"
      "Security engineer needed more API documentation"

  improvements_proposed_for_v2:
    change_1_stage_reordering:
      old_sequence: [product → architecture → ui_ux → engineering → qa → security → deploy]
      new_sequence: [product → ui_ux + architecture (parallel) → engineering → qa + security (parallel) → deploy]
      rationale: "Architect and UI/UX can run in parallel (less dependency); QA and security can validate together"
      expected_impact: "Save 2h on critical path"

    change_2_template_enrichment:
      add_to_product_stage: "Capture security requirements upfront (e.g., 'must support GDPR')"
      reason: "Security engineer needs context from day 1; current process adds 1h rework"
      expected_impact: "Save 1h in security stage; 100% requirements captured upfront"

    change_3_qa_template_update:
      add_template: "Mobile-specific test scenarios for geo_location features"
      reason: "First 3 projects missed edge cases around GPS accuracy and offline mode"
      expected_impact: "Improve test coverage by 15% for mobile platform"

  gis_investment_v2:
    created: "2025-10-15" (after_improvements)
    projects: 5
    success_rate: 0.95
    avg_time_to_completion: "6h 15m" (improvement: -26%)
    metrics:
      test_coverage: 0.91
      security_issues: 0_critical
      perf_slo_met: true
    improvement_summary:
      gate_success: "+28%"
      time_saved: "2h 15m per project"
      token_efficiency: "+12%"
      human_satisfaction: "4.6/5 (up from 3.8/5)"

  recipe_metrics_dashboard:
    recipe: gis_investment
    version_history:
      - v1: [success_rate: 0.67, time: 8.5h, cost: $45]
      - v2: [success_rate: 0.95, time: 6.25h, cost: $38]
      - v3: [success_rate: 0.98, time: 5.5h, cost: $32] (in progress)
    recommendation: "Use v2 for new projects (stable + proven); v3 in beta testing"
    next_improvements: [
      "Add mobile_specific_qa_scenarios (discovered from v2 projects)",
      "Optimize architect prompt for faster design reviews",
      "Add integration_engineer role for payment_processing"
    ]
```

---

## 8. Implementation Strategy

### 8.1 Phase 1: Data Collection Infrastructure (Weeks 1-2)

```yaml
phase_1_tasks:
  task_1_define_training_data_schema:
    owner: architect
    deliverable: "ai/training_data/schema.json (detailed JSON schema)"
    effort: "4 hours"

  task_2_implement_collection_hooks:
    owner: engineer
    deliverables:
      - "src/training/collector.ts (hook into gate validation, agent execution, approval decisions)"
      - "Emit training events to .autoforge/ai/training_data/raw/"
    effort: "8 hours"
    acceptance_criteria:
      - "All gate validations logged with full context"
      - "All agent executions tracked with prompt_version, tokens, duration"
      - "All human decisions logged with reasoning"
      - "All feedback signals captured (downstream_feedback, test_results, security_scan)"

  task_3_setup_storage_infrastructure:
    owner: engineer
    deliverables:
      - "Directory structure for raw, labeled, aggregated, reports"
      - "Script to organize training_data by project and date"
    effort: "4 hours"

  task_4_implement_auto_labeling:
    owner: engineer
    deliverable: "src/training/auto_labeler.ts (label data with success/failure, effectiveness)"
    effort: "6 hours"
    test_cases:
      [
        gate_pass_labeled_excellent,
        gate_fail_with_successful_fix_labeled_good,
        etc,
      ]

  phase_1_total_effort: "22 hours"
```

### 8.2 Phase 2: Pattern Extraction and Analysis (Weeks 3-4)

```yaml
phase_2_tasks:
  task_1_implement_pattern_detector:
    owner: engineer
    deliverables:
      - "src/training/extractor.ts (detect gate_failure_patterns, retry_hotspots, token_inefficiency)"
      - "Generate JSON report with top_3_patterns per category"
    effort: "12 hours"

  task_2_implement_feedback_analyzer:
    owner: engineer
    deliverable: "src/training/feedback_analyzer.ts (parse human_override_rates, downstream_feedback)"
    effort: "6 hours"

  task_3_implement_recipe_aggregator:
    owner: engineer
    deliverable: "src/training/recipe_aggregator.ts (track recipe success rates, time trends)"
    effort: "6 hours"

  task_4_implement_suggestion_engine:
    owner: engineer
    deliverable: "src/training/suggester.ts (output prompt improvement suggestions in YAML format)"
    effort: "10 hours"

  task_5_create_metrics_dashboard:
    owner: engineer
    deliverable: "src/training/dashboard.ts (compute agent_success_rates, token_trends, quality_trends)"
    effort: "8 hours"

  phase_2_total_effort: "42 hours"
```

### 8.3 Phase 3: Integration and CLI (Weeks 5-6)

```yaml
phase_3_tasks:
  task_1_add_train_command:
    owner: engineer
    deliverable: "src/cli/train.ts (npx autoforge train --from-last-N-projects 10)"
    effort: "6 hours"
    features:
      - Load all training data from past N projects
      - Run pattern extraction and suggestion engine
      - Output readable report: "ai/reports/training_{date}.md"

  task_2_add_metrics_command:
    owner: engineer
    deliverable: "src/cli/metrics.ts (npx autoforge metrics show --metric agent_success_rate)"
    effort: "4 hours"

  task_3_create_learning_report_template:
    owner: product
    deliverable: "ai/reports/LEARNING_REPORT_TEMPLATE.md"
    effort: "4 hours"
    content:
      - Executive summary (3 bullet points)
      - Key improvements identified
      - Suggested next actions
      - Metrics trends (with charts)

  task_4_implement_prompt_diff_viewer:
    owner: engineer
    deliverable: "Tool to visualize old_prompt → new_prompt changes"
    effort: "4 hours"

  phase_3_total_effort: "18 hours"
```

---

## 9. Success Criteria

```yaml
training_loop_success_criteria:
  maturity_level_1_data_collection:
    - "100% of gate evaluations logged with full context"
    - "100% of human decisions captured with reasoning"
    - "Training data organized by project and date"
    - "Auto-labeling accuracy >= 95% on structured data"
    - "Success metric: Can recompute any prior project's metrics from raw logs"

  maturity_level_2_pattern_extraction:
    - "Top 5 gate failure patterns identified per quarter"
    - "Retry hotspots identified and ranked by impact"
    - "Token efficiency trends visible across prompt versions"
    - "Recipe success rates tracked and compared"
    - "Success metric: Can predict which prompt version will perform best on new project_type"

  maturity_level_3_feedback_loops:
    - "Prompt improvements deployed based on data (not guessing)"
    - "A/B tests run to validate improvements before rollout"
    - "Gate success rates improve 5-10% per quarter"
    - "Retry rates decrease 10-15% per quarter"
    - "Success metric: New agents onboarded with only 5 template examples (vs 20 before)"

  maturity_level_4_adaptive_system:
    - "System suggests improvements autonomously (not manual review)"
    - "Recipes evolve continuously; each new version has measurable improvement"
    - "Prompt versioning automated; old versions deprecated when beaten"
    - "Models have 'learned' domain patterns; can handle edge cases unseen in training"
    - "Success metric: System applies learnings to 90% of future projects without human guidance"

  long_term_vision:
    - "Token efficiency improved 40% from baseline (better prompts)"
    - "Gate failure rate < 5% (vs 25% baseline)"
    - "Time to first working prototype reduced 50%"
    - "Autonomous decision success rate >= 85%"
    - "System is self-improving; each new project makes the system smarter"
```

---

## 10. Tools and Instrumentation

```yaml
required_tools:
  data_storage:
    - jsonl_format for training data (easy to append, analyze with tools like jq)
    - sqlite or postgres for aggregated metrics (optional but recommended for >100 projects)

  analysis_tools:
    - jq: query jsonl files, compute statistics
    - pandas: Python-based analysis of training_data
    - plotly: visualize trends and metrics

  integration:
    - npx autoforge train: automated training pipeline
    - npx autoforge metrics: real-time dashboard
    - CI/CD: auto-run training weekly; publish reports to team

  example_commands:
    # Count gate failures by agent role
    cat .autoforge/ai/training_data/raw/**/*.jsonl | jq 'select(.gate_result=="fail") | .agent_role' | sort | uniq -c

    # Compute success rate per prompt version
    cat .autoforge/ai/training_data/raw/**/*.jsonl | jq -s 'group_by(.prompt_version) | map({version: .[0].prompt_version, success_rate: (map(select(.gate_result=="pass")) | length) / length})'

    # Find slowest stages
    cat .autoforge/ai/training_data/raw/**/*.jsonl | jq 'select(.stage_execution) | {stage: .stage_id, duration: (.timestamp_end - .timestamp_start)} | sort_by(.duration) | reverse | .[0:5]'
```

---

## 11. Continuous Improvement Roadmap

```yaml
quarterly_training_roadmap:
  q1_2026_foundation:
    goals:
      - "Collect training data from 20+ projects"
      - "Identify top 5 improvement opportunities"
      - "Deploy 3 prompt improvements with A/B tests"
    metrics:
      - "Gate success rate: 75% → 82%"
      - "Avg retries per gate: 1.2 → 0.95"
      - "Human satisfaction: 3.8 → 4.2"

  q2_2026_recipes:
    goals:
      - "Update 5 recipes with improvements"
      - "Create 2 new domain-specific recipes"
      - "Achieve 90%+ success rate on top recipe"
    metrics:
      - "Recipe success rate trending upward"
      - "Time to completion down 20%"
      - "Token efficiency up 15%"

  q3_2026_autonomy:
    goals:
      - "Enable level_2_autopilot on proven recipes"
      - "Autonomous decisions success rate >= 85%"
      - "Escalation rate down to < 10% of projects"
    metrics:
      - "Autonomy level distribution: 50% L1, 40% L2, 10% L0"
      - "Success rate on L2 autopilot: 88%+"
      - "Human oversight time: 30 min/project"

  q4_2026_maturity:
    goals:
      - "Launch level_3_autopilot for cutting_edge teams"
      - "Model training produces measurable improvements quarterly"
      - "System is self-improving; minimal human intervention needed"
    metrics:
      - "Autonomy level distribution: 20% L1, 60% L2, 20% L3"
      - "Token efficiency improved 40% from baseline"
      - "Delivery speed improved 50% from baseline"
```

---

**Document Version:** 1.0
**Author:** AutoForge Training Team
**Date:** 2025-10-29
**Status:** Ready for Implementation
