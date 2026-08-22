# v0.21 Multi-Agent Orchestration Validation

The v0.21 foundation is validated through focused schema, service, command, and
real Git-worktree tests plus the complete AutoForge foundation and legacy suites.

Required release checks:

```bash
npm run format:check
npm run typecheck
npm test
npm run build
```

Acceptance coverage includes dependency unblocking, deterministic priority,
approval gates, agent aliases, overlapping write rejection, concurrent reads,
assignment packets, handoffs, lease expiry, CLI routing, and isolated worktree
provisioning.

Context integration coverage includes canonical task enforcement, role-aware
doctrine and specification selection, persisted selection reasons, project
context-budget enforcement, and fresh-to-stale detection after source changes.

Global workspace coverage includes planned relocation without premature path
replacement, completed relocation by path or project name, AutoForge project
identity validation, previous-path metadata, and migration of path-derived
global storage manifests.

Final orchestration coverage verifies scoped constitution evaluation,
governance-derived execution directives, quality-gate-derived validation
commands, and byte-equivalent canonical context for Codex and Claude on the
same task and role.

Live-use hardening coverage additionally includes:

- non-empty workflow rationale for deferred architecture/design intents;
- sentence-bounded deferral and conflict detection;
- intent-kind aliases accepted by workflow starts;
- completed workflow evidence attached to bootstrap approvals;
- rejection of incomplete workflow evidence;
- vision approval synchronization with the bootstrap manifest;
- descriptive validation and filesystem errors;
- generated JSON Schema catalog and command-level `--schema` output;
- bundled bootstrap → intent → workflow → approval → gates validation.
