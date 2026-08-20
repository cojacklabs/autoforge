# AutoForge 0.7.0 Phase 8 Decisions

## D-8.1 — Compile a strict deterministic Markdown packet

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 8 packet contract

### Decision

Compile every validated `ContextSelection` into a strict `ContextPacket` with a deterministic ID derived from active work, Markdown content, rendered token estimate, selected-source token usage, configured source budget, and mandatory-source overrun status.

Do not include generation timestamps, random identifiers, filesystem paths, or process-local metadata in packet content. The same selection must produce a deeply equal packet.

### Rationale

- Stable packet identity and content make refreshes reviewable and reproducible.
- Runtime validation prevents malformed packet metadata from reaching an adapter.
- Excluding volatile metadata avoids meaningless differences between identical compilations.
- Markdown remains directly readable by people and all initially supported coding agents.

### Consequences

- A packet is identified by active work rather than by a unique generation event.
- Recompiling the same work replaces its current historical artifact.
- Packet-generation history with timestamps or revisions requires a future explicit manifest model.

## D-8.2 — Render selected sources structurally instead of concatenating files

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 8 packet presentation

### Decision

Render only sources admitted by the Phase 7 resolver. Use the stable section order objective, active work, allowed scope, doctrines, decisions, and specifications. Preserve resolver order within each source category.

Project work is rendered as scoped metadata and descriptions. Doctrines retain title, summary, and guidance. Decisions retain statement, reasoning, and consequences. Specifications retain identity, type, description, sorted relationships, source, and selected Markdown content.

Normalize inline labels and sort relationship names and targets, but do not rewrite authored Markdown bodies or invent summaries.

### Rationale

- Structured sections give agents semantic boundaries that raw concatenation lacks.
- Rendering only selected sources enforces the resolver's relevance and budget decisions.
- Sorting relationship metadata removes map-order ambiguity.
- Authored guidance remains intact until an explicit compaction design is introduced.

### Consequences

- Large selected Markdown bodies remain large within the selected-source budget.
- Acceptance criteria and validation sections appear only when future domain models provide structured data for them.
- Summarization, deduplication, and provider-specific compaction remain deferred.

## D-8.3 — Keep explanation output separate from canonical agent context

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 8 explainability

### Decision

Make `autoforge context` print the compiled build packet. Make `autoforge context --explain` print the same packet followed by a separate explanation containing budget accounting, rendered estimate, inclusion scores and reasons, and every exclusion reason.

Persist only the concise build packet to canonical agent context, even when `--explain` is requested. Do not place excluded-source diagnostics in `.autoforge/context/current.md`.

### Rationale

- Agents need selected guidance, not a potentially large inventory of rejected context.
- Humans auditing selection need the complete evidence preserved by Phase 7.
- Keeping both outputs separate avoids changing delivered agent behavior when a user asks for diagnostics.

### Consequences

- Explain mode is intentionally more verbose on standard output.
- The shared canonical context is identical between default and explain runs for the same source snapshot.
- A future machine-readable explanation format can be added without changing packet content.

## D-8.4 — Publish canonical and per-work packet artifacts atomically

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 8 packet storage

### Decision

Write the compiled packet to both `.autoforge/context/packets/<work-id>.md` and the existing cross-agent path `.autoforge/context/current.md`. Write the per-work artifact first and publish `current.md` last so canonical context remains the final delivery pointer.

Use exclusive temporary files, filesystem synchronization, atomic rename, initialized-project checks, canonical symlink-aware containment, and one trailing newline. Reuse the centralized canonical agent-context writer for `current.md`.

### Rationale

- The shared current path already supports Codex, Claude Code, Gemini/Antigravity, Grok Build, Cursor, and generic adapters.
- A stable per-work artifact supports inspection without introducing a packet database.
- Publishing current context last avoids pointing agents at a packet before its work artifact is durable.
- Canonical containment prevents generated artifacts from escaping the repository through symlinks.

### Consequences

- Concurrent identical generations are safe last-writer-wins replacements.
- Cross-file publication is ordered but not one filesystem transaction.
- Packet artifacts remain generated data governed by the configured packet artifact policy.

## D-8.5 — Keep YAML external to the ESM CLI bundle

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 8 production build

### Decision

Mark the runtime `yaml` dependency as external in the tsup ESM build. Continue declaring it as a production dependency so package installation supplies its CommonJS Node entry point.

### Rationale

- Making specification reads CLI-reachable exposed YAML's dynamic CommonJS `require` calls inside the ESM bundle.
- Node can load the installed CommonJS package correctly, while esbuild's bundled ESM shim cannot safely emulate every dynamic require.
- Externalizing the dependency fixes the module-format boundary rather than patching generated output.

### Consequences

- The installed CLI requires its declared production dependencies to be present.
- The CLI bundle remains smaller and passes real cross-process execution tests.
- Package dry-run and bundled CLI tests must remain release gates.

## D-8.6 — Distinguish selected-source budget from rendering overhead

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 8 packet budgeting

### Decision

Treat the configured Phase 7 budget as the maximum for selected source material. Preserve its exact accounting in the packet and separately estimate final rendered Markdown size with the same replaceable token estimator.

Do not rerank, silently truncate, or drop selected content during compilation. Report both selected-source and rendered estimates in explain mode.

### Rationale

- The resolver owns relevance and budget admission; the compiler should not make hidden selection decisions.
- Markdown headings and semantic labels add useful structural overhead.
- Separate estimates make overhead visible without invalidating the resolver snapshot.

### Consequences

- Rendered packet estimates may exceed the selected-source maximum by structural overhead.
- Provider-specific hard output limits require a future compaction or reserved-overhead policy.
- Mandatory-work overruns remain visible and are never silently removed.
