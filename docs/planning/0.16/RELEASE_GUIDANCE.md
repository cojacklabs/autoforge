# v0.16 Release Guidance

## What Changed

v0.16 adds domain intelligence for representing product concepts, relationships, provenance, and invariants as durable project knowledge. Domain artifacts are persisted under `.autoforge/domain/` and can be delivered through context packets and agent directives.

## Operator Workflow

```bash
autoforge domain init
autoforge domain list
autoforge domain show <concept-id>
autoforge domain check
```

Use `domain check` to surface verified, violated, and unknown invariant evidence before implementation. Unknown evidence remains visible and is not treated as verified.

## Boundary

The v0.16 release does not generate database schemas, API contracts, DTOs, permissions, or UI models. Those are future consumers of the domain layer. Governance remains the enforcement boundary, and the repository remains the canonical source of truth.
