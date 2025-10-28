# Performance Engineering

Plan and document performance testing for critical flows.

- `plan.md` – High-level strategy and target SLIs.
- `scripts/` – Load test scripts (k6/Artillery) and instructions.
- `ai/logs/perf/` – Session logs from performance runs.

Collaborate with SRE to align on SLOs and observability requirements.

## Prompt Snippet

```
Execute .autoforge/ai/prompts/performance_engineer.yaml
Create docs/perf/plan.md and add load test scripts under docs/perf/scripts/.
Coordinate with SRE on SLOs and publish results to ai/reports/perf/.
```
