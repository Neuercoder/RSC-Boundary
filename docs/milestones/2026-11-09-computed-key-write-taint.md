# Computed-key write taint (2026-11-09)

## Status

Implemented and locally verified.

## Scope delivered

- Track sensitive computed keys used in element-access assignment targets,
  even when the stored value is public.
- Cover all 16 binary assignment operators using TypeScript's assignment-token
  range, preserving existing source reasons and mutation propagation.
- Add analyzer and CLI regressions for direct and indirect keys, spreads,
  immediate nested receivers, and clean write/read/comparison controls.

See the [specification](../specs/computed-key-write-taint.md) for behavior and
limits. This milestone does not add alias analysis, normalize receiver spellings,
propagate nested writes to enclosing objects, or model destructuring writes.

## Verification results

- Before the implementation, both new regressions failed: the analyzer found
  zero of the 19 expected leaks, and the CLI returned exit code 0.
- `npm test`: passed, 43/43 tests, including strict TypeScript builds.
- `npm run lint`: passed.
- `git diff --check`: passed.
- The built CLI reports 19 client-boundary findings and exits 1 for the new
  fixture, with no findings for its public write/read/comparison controls.
