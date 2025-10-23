# Deployment Runbook – Team Todo App

1. Ensure `ai/code_targets.yaml` paths are configured for backend/frontend.
2. Validate context:
   ```bash
   cd autoforge
   ./scripts/validate_context.sh
   ```
3. Run CI pipeline or local equivalent (install, lint, test, build).
4. Deploy to staging environment (link to workflow).
5. Run smoke tests listed in `qa/tests_todo_app.md`.
6. Approve production deployment once staging checks pass.
