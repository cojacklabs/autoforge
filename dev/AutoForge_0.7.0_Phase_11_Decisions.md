# AutoForge 0.7.0 Phase 11 Decisions

## D-11.1 — Extend the existing specification domain instead of creating design memory

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 11 design-context architecture

### Decision

Represent design context as typed metadata on the existing Markdown `Specification` model. Add `token`, `state`, and `responsive` specification types alongside the existing `screen`, `component`, and `flow` types. Keep `architecture` and generic `design` specifications available for non-design-contract content.

Make typed design metadata optional for the general specification schema so existing version-1 artifacts remain readable. Require it through a stricter `DesignSpecification` schema for the Phase 11 validation and import workflow.

### Rationale

- Specifications already provide IDs, relationships, tags, source attribution, Markdown content, storage, relevance selection, and packet delivery.
- A second design store would duplicate indexing, budgeting, and adapter behavior.
- Compatibility permits gradual enrichment of existing screen, component, and flow artifacts.
- A strict import boundary guarantees that newly managed design context has machine-readable structure.

### Consequences

- Generic design-type specifications can still exist but are excluded from typed design listings.
- Imported Phase 11 design artifacts always contain a matching typed contract.
- Design files use the same atomic store and artifact policy as all other specifications.

## D-11.2 — Model six focused design contracts

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 11 design schemas

### Decision

Support six discriminated design metadata contracts:

| Type         | Structured contract                                                             |
| ------------ | ------------------------------------------------------------------------------- |
| `screen`     | Optional route, unique named regions, optional entry-state reference            |
| `component`  | Unique variants, typed properties, required flags, descriptions, unique slots   |
| `token`      | Category, canonical value, optional named mode values                           |
| `flow`       | Ordered unique steps, optional screen references, actions, validated next links |
| `state`      | Screen/component subject, canonical state name, conditions, observable changes  |
| `responsive` | Screen/component subject and named bounded viewport behavior rules              |

Require metadata `kind` to match the specification type. Preserve general relationships for cross-artifact links such as uses, contains, applies-to, transitions-to, and used-by.

### Rationale

- These contracts cover the plan's required screens, components, tokens, flows, states, and responsive behavior.
- Structured fields give resolvers and coding agents reliable semantics that prose alone cannot provide.
- Open relationship names keep the graph extensible without embedding every design-system convention in the kernel.
- Validation catches duplicate names, broken flow links, invalid subjects, and impossible responsive bounds before delivery.

### Consequences

- Token values remain strings so CSS values, semantic aliases, and platform values are all representable.
- Detailed visual geometry and full design-tool node trees are intentionally excluded.
- Relationship integrity remains one-hop and permits unresolved external references, which the resolver reports explicitly.

## D-11.3 — Use standard Markdown with YAML frontmatter as the exporter boundary

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 11 manual and generated input

### Decision

Use the existing specification Markdown codec for manual and generated design files. Add `autoforge design validate <file>` and `autoforge design import <file>`. Require input files to resolve canonically inside the project.

Treat the frontmatter and Markdown format as the initial exporter contract. Do not add Figma API authentication, plugin communication, webhooks, remote fetches, or a Figma-specific state store in Phase 11.

### Rationale

- Manual fixtures validate the architecture before external integration.
- Any future exporter can emit a stable, documented local file format.
- Repository-contained input preserves workspace and review boundaries.
- Avoiding remote integration keeps the kernel deterministic and credential-free.

### Consequences

- Users or external tools place generated Markdown in the repository before import.
- `source` records provenance such as `manual:design-system` or a future exporter identifier.
- External design synchronization and conflict resolution require a future explicit design.

## D-11.4 — Preserve AutoForge-owned import timestamps

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 11 registration semantics

### Decision

Validate an input file's `updatedAt` as part of the transport format, but replace it with the AutoForge registry clock during import. Preserve authored identity, type, name, description, relationships, tags, source, typed design metadata, and Markdown content.

### Rationale

- Registry timestamps represent when AutoForge accepted an artifact.
- Source-system timestamps can have unknown clocks or semantics.
- Existing registry behavior already owns creation timestamps consistently.
- Provenance remains available through `source` without conflating clocks.

### Consequences

- Exact upstream modification time is not retained as a separate field.
- A future exporter manifest may add explicit source revision and timestamp metadata.
- Duplicate IDs remain conflicts rather than implicit updates.

## D-11.5 — Rank design metadata and relationships through the existing resolver

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 11 relevance selection

### Decision

Include serialized typed design metadata in specification token estimates and relevance scoring with a dedicated field weight. Continue using objective and work-scope tokens, deterministic ordering, one-hop relationship expansion, unresolved-reference diagnostics, and the existing source budget.

Do not create a design-only selection pass, budget, or packet.

### Rationale

- Responsive behavior, property names, state changes, and token modes may be the strongest task signals.
- Relationship expansion naturally brings connected screens, components, states, tokens, and flows into context.
- One resolver keeps budget and exclusion behavior consistent across architecture and design sources.
- Design-specific selection would risk duplicate or contradictory packet content.

### Consequences

- Design metadata competes fairly with other specifications for the configured budget.
- Unrelated design systems are excluded rather than loaded indiscriminately.
- Exporters can improve selection by emitting meaningful tags, descriptions, relationships, and typed values.

## D-11.6 — Render design contracts structurally in build packets

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 11 agent delivery

### Decision

Render selected typed metadata as a human-readable `Design Contract` inside the existing specification section. Use type-specific labels for routes, regions, variants, properties, token modes, flow steps, state conditions and changes, and responsive ranges.

Continue rendering authored Markdown content and sorted relationships after the structured contract. Do not emit raw JSON or YAML metadata into the packet.

### Rationale

- Coding agents benefit from explicit implementation constraints without parsing frontmatter.
- Type-specific presentation is more concise and legible than serialized objects.
- Authored content remains available for details not covered by the structured fields.
- The packet remains one shared cross-agent Markdown artifact.

### Consequences

- Packet token estimates include rendered design-contract overhead.
- All supported agents receive identical selected design context.
- Provider-specific visual payloads and screenshots remain outside this phase.

## D-11.7 — Keep inspection and delivery separate

**Status:** Accepted  
**Date:** 2026-08-20  
**Scope:** Phase 11 CLI behavior

### Decision

Add `autoforge design list [--type <type>]` for typed inventory and `autoforge design show <id>` for canonical Markdown inspection. Keep `autoforge context` as the only operation that resolves relevance and publishes the active build packet.

### Rationale

- Inventory commands should not mutate or imply relevance.
- Canonical inspection helps users review what was stored.
- Context delivery must remain active-work-driven and budgeted.
- Separate commands prevent a design listing from becoming accidental agent context.

### Consequences

- Design inventory can include artifacts not selected for current work.
- Context explanations continue to show why design specifications were included or excluded.
- Imported design context follows the same Phase 9 freshness and refresh rules as every other selected source.
