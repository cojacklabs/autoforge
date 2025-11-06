# AutoForge Rules — Overview

This directory defines the non‑negotiable rules the AI orchestrator must follow during planning, design, development, testing, and validation.

Read these in this order:

1. enforcement.yaml — Hard rules (schemas, quality gates, approvals, memory)
2. execution_policies.yaml — Workflow loop, concurrency, retries, compliance reporting
3. coding_standards.md — TypeScript/ESLint/Prettier/JSON/YAML/MD norms
4. communication_contract.md — How to ask, report, and acknowledge
5. change_management.md — Change requests, impact analysis, commit playbook, semver

The orchestrator must acknowledge that these rules supersede ad‑hoc instructions. When in doubt, follow governance and session policies first, then these rules, then user prompts.
