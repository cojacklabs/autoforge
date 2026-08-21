# v0.15 Release Guidance

## What Changed

v0.15 adds a project constitution layer to make governance rules explicit, scoped, persisted, and available to context packets and agent contracts. The release also adds deterministic CLI commands for inspecting and checking those rules.

## Upgrade Notes

The governance layer is additive. Existing `.autoforge` projects continue to work without a constitution. Run `autoforge constitution init` when the project is ready to adopt the default constitution and its managed no-silent-drift rule.

Constitution state is stored at `.autoforge/governance/constitution.json`. Keep this file under version control when governance is part of the project contract; do not commit secrets or generated credentials into rule metadata.

## Operator Workflow

1. Initialize the project if it does not yet have a constitution.
2. List and inspect rules before starting consequential work.
3. Run `autoforge constitution check "<objective>"` for a proposed objective.
4. Resolve blocked or conflicting evaluations before implementation.
5. Include the resulting context packet and validation evidence in the normal task review.

## Release Boundary

The v0.15 CLI intentionally remains deterministic and non-interactive. Rich conflict resolution and interactive workflows remain deferred to later roadmap phases.
