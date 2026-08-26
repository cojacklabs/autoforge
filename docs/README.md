# AutoForge Documentation

This page is the navigation entry point for humans and coding agents. Use it to
distinguish current operational guidance from historical design records.

The installed CLI is authoritative for exact syntax:

```bash
autoforge version
autoforge help
autoforge schemas list
```

## Start Here

| Need                                                         | Read                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| Install AutoForge and complete a first work item             | [Quickstart](QUICKSTART.md)                                 |
| Assign Claude, Codex, Cursor, Gemini, Grok, or another agent | [Agent Setup Guide](AUTOFORGE_AGENT_SETUP_GUIDE.md)         |
| Decide which capability to use for a prompt                  | [Agentic AI Guide](AUTOFORGE_AGENTIC_AI_GUIDE.md)           |
| Look up exact CLI syntax                                     | [CLI Reference](AUTOFORGE_CLI_REFERENCE.md)                 |
| Bootstrap a product idea through gated artifacts             | [Bootstrap Pipeline](BOOTSTRAP_PIPELINE.md)                 |
| Transfer work between agents                                 | [Cross-Agent Handoffs](CROSS_AGENT_HANDOFFS.md)             |
| Understand durable versus operational state                  | [Governance and Memory](GOVERNANCE_AND_MEMORY.md)           |
| Configure local model credentials                            | [Local Provider Credentials](LOCAL_PROVIDER_CREDENTIALS.md) |

## Continuous Workflow

1. Capture and assess an idea with `intent`.
2. Register evidence and provenance with `research` and `knowledge`.
3. Check `constitution`, `domain`, and applicable doctrines.
4. Validate and import design specifications with `design`.
5. Generate planning artifacts or create features, phases, tasks, and issues.
6. Record explainable priority with `strategy`.
7. Start scoped work and resolve `context --explain`.
8. Validate edits with `check` and `gate check`.
9. Record decisions and evidence before `done`.
10. Use `recap`, handoffs, orchestration, and the twin to continue with another
    person, agent, machine, or session.

Do not use raw conversational transcripts as the source of truth. Persist the
decisions, active work, changed files, validation, risks, open questions, and
next action that another participant needs.

## v0.25 Architecture and Release

- [Platform Migration Plan](planning/0.25/PLATFORM_MIGRATION_PLAN.md)
- [Package Ownership and Versioning](planning/0.25/PACKAGE_OWNERSHIP_AND_VERSIONING_POLICY.md)
- [Migration Guide](planning/0.25/MIGRATION_GUIDE.md)
- [Release Readiness](planning/0.25/RELEASE_READINESS.md)
- [Independent Claude Audit](planning/0.25/CLAUDE_AUDIT_REPORT.md)
- [Future Intelligence and Design Orchestration](planning/0.25/FUTURE_INTELLIGENCE_AND_DESIGN_ORCHESTRATION.md)

The planning documents describe architecture and release gates; they do not
authorize a tag or npm publication.

## Specialist References

- `docs/ai/` contains companion operating playbooks. Its README identifies
  which guidance remains current.
- `docs/prd/` contains product requirements.
- `docs/blueprint/` contains product and technical blueprints.
- `docs/uiux/` contains UI/UX references.
- `docs/observability/` and `docs/perf/` contain operational guidance.

## Historical Material

Documents under `docs/planning/<older-version>/`, `docs/superpowers/`, and much
of `docs/dev/` preserve prior implementation history. They may mention commands
or architecture that no longer exist. Treat them as historical evidence unless
a current guide links to them explicitly; never copy command syntax from them
without confirming it through `autoforge help` or the current CLI reference.
