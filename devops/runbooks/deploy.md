# Deployment Runbook (Template)

1. Validate context
   ```bash
   ./scripts/validate_context.sh
   ```
2. Run CI pipeline or local equivalent.
3. Promote image to staging using GitHub Actions deploy workflow.
4. Run smoke tests (`npm test -- --smoke` or equivalent) and document results in `ai/logs/deployments/stage_deploy.md`.
5. If staging passes, approve production deployment and monitor dashboards for 30 minutes.
6. Update this runbook with new steps or tooling when the DevOps agent evolves the pipeline.
