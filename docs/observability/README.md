# Observability

Define logs, metrics, and traces required to monitor the system.

- `dashboards.md` – User-journey dashboards and service health KPIs.
- `alerts.md` – Alert conditions, severities, and escalation paths.
- `slo.md` – SLIs/SLOs and error budgets agreed with Performance/DevOps.

Keep these files aligned with `devops/devops.yaml` and update when services change.

## Prompt Snippet

```
Execute autoforge/ai/prompts/sre_engineer.yaml
Ensure dashboards cover user journeys and critical service paths.
Document alerts and SLOs in docs/observability/ and summarize under ai/reports/observability/.
```
