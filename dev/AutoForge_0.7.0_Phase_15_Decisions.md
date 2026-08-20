# AutoForge 0.7.0 — Phase 15 Decisions

## Decision: Use a provenance-labeled Virdua pilot fixture

- **Statement:** The first Virdua dogfood run uses a checked-in, manually authored design fixture with `source: manual:virdua-pilot` until a real Virdua Figma export is available.
- **Reasoning:** The repository currently has no Figma URL, export, or connected design source. A local fixture still exercises the complete specification, relationship, resolver, and build-packet path without misrepresenting provenance.
- **Consequence:** Phase 15 validates context delivery and graph traversal. Visual fidelity, agent correction count, and implementation rework remain unmeasured until the real screen is supplied.
- **Scope:** `virdua`, `design`, `dogfood`

## Decision: Keep the pilot graph intentionally small

- **Statement:** The pilot models one dashboard screen, two components, one token, one state, and one flow.
- **Reasoning:** A bounded graph makes packet inclusion and relationship traversal observable while keeping the first design-to-code validation reviewable.
- **Consequence:** The packet contains six design specifications and their linked contracts, with no unrelated project context selected.
- **Scope:** `virdua`, `context`, `specifications`
