# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-10-28

Highlights
- Default install directory renamed to `.autoforge/` (legacy `autoforge/` still supported by CLI and validators).
- Added STOP/APPROVAL gates with `max_retries` across core prompts for safe handoffs.
- Introduced recipe-based orchestration: `docs/blueprint/recipes/*` and enhanced `automation_bootstrap` to select recipes.
- Added integration registry `ai/integrations.yaml` and optional roles (integration_engineer, payments_engineer, data_analyst, compliance_officer) with prompt stubs.
- New quality gates: tests present and CI config present, with planning stubs accepted.
- New multi-project guide: `docs/AUTOFORGE_MULTI_PROJECT_GUIDE.md`.
- Added recipe-driven CI templates under `devops/ci/`.

Changes
- CLI supports `.autoforge` for init/upgrade/validate/refresh and legacy fallback.
- `scripts/generate_snapshot.js` + manifest include_globs updated for `.autoforge`.
- `README.md` and `docs/QUICKSTART.md` updated with new paths, recipes, and links.
- `bin/autoforge.js` refresh includes the multi-project guide for agent retraining.

## [0.1.x]
- Initial public release of @cojacklabs/autoforge with config-driven workflow, planning-first quality gates, project snapshot, and onboarding prompt generator.

