# Quality Policies — TypeScript, ESLint, Prettier, and Artifact Validation

AutoForge v0.4 enforces non‑negotiable quality gates on every patch to prevent syntax errors and ensure standards.

## Commands and Defaults
- TypeScript: `npm run typecheck` (fallback: `tsc --noEmit`).
- ESLint: `npm run lint` with `--max-warnings=0` (fallback: `eslint <files>`).
- Prettier: `npm run format:check` (fallback: `prettier --check <files>`; `--write` if allowed).
- Artifacts: JSON Schema validation; YAML/MD parse and lint; optional OpenAPI lint.

Helper scripts (optional):
- `node scripts/run_quality_gates.js --files <comma-separated-paths> [--format-write]` — runs parse → Prettier → ESLint → TSC (+ optional tests via config) and prints a JSON summary.
- `node scripts/validate_artifacts.js --schema <ai/schemas/Name.v1.json> --files <artifact1.json,artifact2.json>` — validates artifact JSON against schema using Ajv.

## Policy Configuration (autoforge.config.json)
```json
{
  "qualityPolicies": {
    "typecheck": { "cmd": "npm run typecheck", "required": true },
    "lint": { "cmd": "npm run lint", "maxWarnings": 0, "required": true },
    "format": { "cmdCheck": "npm run format:check", "cmdWrite": "npm run format", "allowWrite": true },
    "docs": { "jsonSchema": true, "yamlLint": true, "markdownLint": true, "openapiLint": true },
    "tests": { "cmd": "npm test -s", "runOnChanged": true }
  }
}
```

## Gate Order and Scope
1) Parse checks: JSON/YAML/MD/OpenAPI (if configured) on changed files.
2) Prettier: `--check`; if allowed, run `--write` then re‑check.
3) ESLint: on changed files with `--max-warnings=0`.
4) TypeScript: project check (`--noEmit`).
5) Targeted tests: if configured and fast.

## Auto‑Repair Loop
- Prettier: auto‑format if `allowWrite=true`.
- ESLint: try `--fix`; re‑run check; escalate remaining issues.
- Artifacts: regenerate to satisfy schema; include error messages in the prompt.
- TypeScript: localize to failing files/symbols; attempt minimal fixes; cap attempts.

## Enforcement Hooks
- Pre‑apply: run gates against the proposed diff (staged or temp workspace).
- Post‑apply: re‑run gates; on failure after repairs, halt and request human review.
- Provenance: log commands, versions, timing, changed files, pass/fail to the IP ledger.

## Missing Tooling
- If `tsconfig.json`/`.eslintrc.*`/`.prettierrc*` are absent, scaffold minimal defaults and run again.
- Monorepos: respect per‑package configs and project references.
