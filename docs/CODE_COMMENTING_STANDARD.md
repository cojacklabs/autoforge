# Code Commenting Standard

AutoForge-guided agents preserve intent that code, types, tests, and durable
decisions cannot communicate clearly on their own. The goal is durable context,
not more comments.

## Add a Comment When It Protects Understanding

Use concise explain-why commentary for:

- public API contracts whose behavior or constraints are not evident from the
  type signature;
- architectural boundaries and ownership rules;
- security, privacy, compatibility, and migration constraints;
- non-obvious algorithms, invariants, ordering requirements, or failure modes;
- intentionally unusual implementation choices and rejected obvious
  alternatives.

Prefer typed APIs, descriptive names, focused tests, and AutoForge decisions
when those carry the information more reliably. Link a durable decision when a
comment depends on project-wide rationale that may evolve.

## Do Not Add Noise

Reject comments that:

- restate syntax or narrate each line;
- preserve prompts, chat transcripts, or temporary implementation narration;
- describe behavior the code no longer has;
- replace a useful type, test, validation error, or decision record;
- leave an unactionable `TODO` or `FIXME`.

Comment density is never a quality target. Self-explanatory code does not need a
comment merely to satisfy a quota.

## Follow-Up Markers

Every `TODO` or `FIXME` in a selected source file must include an AutoForge
`task.*` or `issue.*` reference on the same line. For example:

```ts
// TODO(issue.support-node-26): Remove this compatibility branch after approval.
```

`autoforge gate check` reports an `untracked-follow-up` finding when the marker
has no work reference. This is the objective automated rule. Whether commentary
adequately explains intent remains a review responsibility because arbitrary
semantic scoring or documentation quotas would reward noise.

## Agent Completion Review

Before completion, review changed code and ask:

1. Would another maintainer understand the non-obvious reason for this design?
2. Are public contracts and invariants clear from types, tests, or concise
   commentary?
3. Could any new comment become stale or be replaced by clearer code?
4. Does every follow-up marker point to durable AutoForge work?

Generated Agent contracts and the built-in `commenting` doctrine carry this
standard into agent execution. Project-specific `AGENTS.md` instructions may
strengthen it but should not introduce comment-volume quotas.
