# v0.17 Design Protocol Audit

## Current Coverage

- Typed design schemas already cover screens, components, tokens, flows, states, and responsive metadata.
- Markdown/YAML parsing and serialization are centralized in `src/specifications/codec.ts`.
- Repository persistence is centralized in `SpecificationFileStore` under `.autoforge/specifications/`.
- `SpecificationRegistry` provides deterministic listing, filtering, and relationship traversal.
- `design validate`, `design import`, `design list`, and `design show` are implemented and tested.
- Design specifications can be selected into context packets through the existing specification resolver.

## Delivered Since Audit

- Provenance metadata is schema-validated and serialized with specifications.
- Registry search and missing-target relationship diagnostics are deterministic.
- `design search`, `design check`, and `design update` are available through the CLI.
- Context packets explain selected design provenance.
- Bundled CLI coverage exercises import, search, update, check, and context delivery.

## Remaining Gaps Before v0.17 Release

- Add explicit design provenance and source freshness reporting rather than relying only on `source` and `updatedAt`.
- Add freshness status computation and stale-source diagnostics.
- Add end-to-end coverage for stale and invalid design artifacts.
- Align the CLI reference and agent guidance with the final v0.17 command surface.

## Recommended Order

1. Define provenance and freshness fields and invariants.
2. Implement registry search and relationship diagnostics.
3. Add create/update CLI workflows.
4. Extend context explanations and agent contracts.
5. Complete end-to-end tests and release documentation.

## Release Boundary

The current implementation is a strong v0.16 baseline, but v0.17 is not complete until the gaps above are implemented and validated. Interactive UI and autonomous visual generation remain deferred.
