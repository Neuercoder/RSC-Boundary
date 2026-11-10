# JSX-fragment taint (2026-11-10)

## Status

Implemented and locally verified.

## Delivered

- Propagate sensitive expression children through JSX fragments, including nested
  fragments and existing variable/collection flows.
- Inspect direct fragment children of local client components, preserving the
  existing boundary rule and rendered-child diagnostic.
- Preserve public text/comment/expression controls and source provenance.
- Specification: [JSX-fragment taint](../specs/jsx-fragment-taint.md).

## Verification

- Before implementation, both new regressions failed: the analyzer found no
  boundary leaks and the CLI returned clean (0).
- After implementation, `npm test` passed all 43 tests, including the TypeScript
  builds and both new regressions; `npm run lint` and `git diff --check` passed.
- The fixture's seven leak cases are detected and three public controls stay
  clean. Nested JSX elements and named `React.Fragment` components are out of
  scope; this milestone covers fragment syntax only.
