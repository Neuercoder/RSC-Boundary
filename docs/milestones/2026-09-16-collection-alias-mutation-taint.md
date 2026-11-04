# Milestone 2026-09-16 — Direct Collection-Alias Mutation Taint

- **Status:** Implemented
- **Date:** 2026-09-16
- **Spec:** [collection-alias-mutation-taint.md](../specs/collection-alias-mutation-taint.md)

## Goal

Close the collection-mutation blind spot where sensitive data was inserted
through a direct immutable alias but later read through the original
collection, or vice versa.

## Scope

- Record direct identifier aliases declared with `const`.
- Merge transitive direct aliases into a per-file group.
- Propagate source provenance from a supported mutation receiver to every
  name in its alias group.
- Test original-to-alias, alias-to-original, transitive, and clean behavior.
- Document exact supported and unsupported alias forms.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | Immutable alias groups for collection mutation propagation |
| `test/fixtures/collection-alias-taint/` | Intentional alias flows and clean counterpart |
| `test/analyzer.test.ts`, `test/cli.test.ts` | Unit and end-to-end coverage |
| `docs/specs/collection-alias-mutation-taint.md` | Feature contract and limits |

## Verification

- `npm run build` — strict TypeScript compilation.
- `npm test` — three intentional boundary flows and no clean-alias finding.
- `npm run lint` — ESLint clean.
- `node dist/cli.js scan test/fixtures/collection-alias-taint` — three
  intentional boundary findings, exit code 1.

## Out of scope

Mutable, property, destructured, function-escaped, and cross-module aliases
remain unsupported. This milestone does not add type-aware cross-module
dataflow.
