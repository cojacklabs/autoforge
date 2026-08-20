# AutoForge 0.8 Schema Decision Log

The following contracts were approved before schema implementation and are persisted in `.autoforge/state/decisions.json`:

| Contract            | Approved behavior                                                                     |
| ------------------- | ------------------------------------------------------------------------------------- |
| Intent storage      | Registry-backed specification with raw and structured fields; work stores references. |
| Intent fan-out      | One intent can link to multiple independently tracked work items.                     |
| Triage              | Additive labels with explicit evidence and conflict reporting.                        |
| Readiness evidence  | Minimum evidence profiles vary by work kind and expose missing fields.                |
| Confidence          | Categorical level plus optional bounded percentage, always explained.                 |
| Research provenance | Typed source, locator, capture time, and confidence when available.                   |
| Token naming        | `token` is canonical; `design-token` is an import/documentation alias.                |
| Planning freshness  | Generated artifacts retain source fingerprints and freshness metadata.                |
