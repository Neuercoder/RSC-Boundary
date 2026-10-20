# Destructuring-assignment taint (2026-10-20)

## Status

Implemented and locally verified.

## Scope delivered

- Replace the unreachable binding-pattern assignment path with recursive handling
  of expression-shaped object/array assignment patterns.
- Support nested patterns, renamed/shorthand properties, rest, holes, defaults,
  and property/index targets, preserving source provenance.
- Add a neutral-name fixture and analyzer/CLI regression tests.
- Document aggregate propagation, conservative defaults, and exact-text index limits
  in the [specification](../specs/destructuring-assignment-taint.md).

## Verification

- Before implementation, the new CLI regression detected only 2 of 11 expected leaks.
- After implementation, `npm test` passed 39/39 tests, including strict TypeScript
  build/test compilation and both new regression tests.
- `npm run lint` and `git diff --check` passed.
- Clean destructuring controls and a sibling indexed target remain unflagged.

## Non-goals

No field-sensitive destructuring, control-flow feasibility, taint removal, alias
tracking, or cross-module type-aware analysis.
