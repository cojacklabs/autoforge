# Agentic Blueprint

## Vision

Describe the end-to-end experience the ROS AI platform will deliver. Clarify the primary personas (investor, analyst, partner, admin) and the business outcomes we target.

## Product Pillars

1. **Discovery & Research** – Surface high-quality opportunities and contextual insights.
2. **Due Diligence Automation** – Automate underwriting, document checks, and compliance workflows.
3. **Execution Orchestration** – Coordinate stakeholders through the 14-stage assembly line.
4. **Reporting & Analytics** – Provide live dashboards, alerts, and actionable intelligence.

## Architecture Overview

- **Frontend**: Web client (React/Vite) consuming GraphQL/REST APIs, leveraging component primitives documented in `/src`.
- **Backend**: Service layer (Node/Express or Wasp) that implements domain logic, integrates third-party data providers, and exposes APIs defined in `api/openapi.yaml`.
- **Data**: PostgreSQL for transactional data, optional warehouse for analytics.
- **Infra/DevOps**: Containerized workloads deployed via GitHub Actions to cloud (e.g., GCP Cloud Run), with observability (logs, metrics, traces) wired through devops artifacts.

## Governance

- Every feature flows through the agent chain defined in `ai/AGENTS.md`.
- Change requests originate in `change_requests/` and must pass QA, security, and DevOps gates.
- Documentation updates are part of the deliverable; agents cannot merge changes without updating the blueprint or PRD.

## Current Status

Use this section to note active initiatives, open risks, or pending decisions. Update during each change request to keep the blueprint synchronized with implementation reality.
