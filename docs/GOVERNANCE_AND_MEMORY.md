# Governance, Session Policy, and Memory Enforcement

AutoForge v0.4 introduces strict governance, session rules, and enforced memory to reduce user reminders and protect IP.

## GovernancePolicy
- Mode: `strict` (local‑only), `supervised` (approval prompts), or `flexible`.
- Redaction: scrub PII/secrets from logs/reports/exports.
- Egress: allowed domains/tools; everything else requires approval and is logged.
- Data residency: local datasets by default; opt‑in export.

## SessionPolicy
- Roles: allowed adapters for the run.
- Artifacts: permitted inputs/outputs (by schema id).
- Pre‑step rules: read memory, load relevant artifacts.
- Output rules: validate schemas and pass quality gates.
- Repair: max attempts before escalation.
- Permissions: `allowApply`, `allowResearchEgress`.

## Memory Enforcement
- Mandatory reads: session start, role switch, pre‑codegen, pre‑approval, milestone completion.
- Delta writes: after each decision step, append decisions, assumptions, open questions to `ai/memory/{role}.md`; summarize to `ai/memory/global.md`.
- Retrieval hygiene: summarize and link to history; prefer artifact references.

## Approvals and Auditing
- Any egress or high‑risk changes prompt for approval (mode‑dependent).
- IP ledger logs approvals, tool calls, gate results, and outcomes.

### Recording approvals (programmatic pattern)

```
import { Coordinator } from "ai/runtime/coordinator.js";
const c = new Coordinator({ repoRoot: process.cwd(), governance: { mode: "strict" } });

// Request an approval (e.g., UI/UX inspiration research)
const id = c.requestApproval({ action: "uiux_inspiration", reason: "Research tokens", scope: ["Button"] });

// Persist the decision (granted/denied); this updates events + memory
c.recordApprovalDecision(id, { granted: true, note: "Approved by client", action: "uiux_inspiration", role: "uiux" });

// Use in the run (explicit approvals map)
const res = await c.fromPrompt("Fix button UX", { approvals: { uiux_inspiration: true } });
```

If you don’t use Coordinator directly, include the decision in session notes and ensure it is captured in `.autoforge/ai/memory/`.

