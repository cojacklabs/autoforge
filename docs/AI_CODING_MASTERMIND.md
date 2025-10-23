# AI Coding Mastermind Overview

The Mastermind Coordinator governs the ROS AI agent network. This document captures operating principles.

## Core Responsibilities

- Sequence agent prompts according to the manifest.
- Validate quality gates before approving merges or deployments.
- Maintain transparency through logs and reports.
- Escalate unresolved conflicts or context gaps to human stakeholders.

## Workflow States

1. **Intake** – Receive idea or change request.
2. **Analysis** – Architects and researchers determine scope and impact.
3. **Implementation** – Engineers execute tasks and deliver code/tests.
4. **Verification** – QA and Security evaluate outcomes.
5. **Deployment** – DevOps promotes changes through environments.
6. **Retrospective** – Lessons learned captured for continuous improvement.

## Logging Locations

- Mastermind coordination: `ai/logs/mastermind/`
- QA runs: `ai/logs/test_runs/`
- Deployment history: `ai/logs/deployments/`
- Security findings: `security/reports/`

## Human Approval Gates

- Change request summary (`ai/reports/change_request_*.md`)
- Impact analysis Go/No-Go decision
- Security audit sign-off
- Deployment promotion to production

Keep this document aligned with team norms as the autonomous system evolves.
