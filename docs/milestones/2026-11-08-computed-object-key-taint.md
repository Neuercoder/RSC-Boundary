# Computed object-key taint (2026-11-08)

## Status

Implemented and locally verified.

## Scope delivered

- Propagate sensitive computed object names into whole-object taint.
- Cover ordinary properties, methods, getters, and setters without evaluating
  their bodies as values.
- Preserve existing propagation through variables, nested literals, and spreads.
- Add analyzer and CLI regressions with eight leaking cases and three public
  controls, including a source-provenance assertion.

See the [specification](../specs/computed-object-key-taint.md) for behavior and
limitations. This milestone does not change dynamic property writes or introduce
alias, serialization, or control-flow analysis.

## Verification results

- Before the implementation, both new regression tests failed: the analyzer
  reported zero of the eight expected findings and the CLI returned exit code 0.
- `npm test`: passed, 41/41 tests, including strict TypeScript builds and both
  new regressions.
- `npm run lint`: passed.
- `git diff --check`: passed.
- The built CLI reports eight client-boundary findings and exits 1 for the
  fixture; the three public controls remain unflagged.
