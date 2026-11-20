# Destructuring-assignment taint (2026-11-04)

## Status

Implemented and locally verified.

## Scope delivered

- Recognize expression-shaped object and array assignment patterns rather than
  treating them as declaration binding patterns.
- Recursively propagate taint to identifier, property, and element destinations,
  including nested patterns, holes, and rest targets.
- Combine default-value taint with incoming taint; recognize statically named
  sensitive object members.
- Add a neutral-name fixture with exact-location analyzer regression coverage and
  a built-CLI JSON/exit-status test.

The [specification](../specs/destructuring-assignment-taint.md) records the behavior
and boundaries. The existing monotonic, conservative model is unchanged; no
per-member RHS projection, alias tracking, or control-flow feasibility is added.

## Verification results

- Before the implementation, the initial regression fixture produced only two
  boundary findings instead of twelve.
- The completed fixture produces fifteen boundary findings and leaves its four
  clean controls unflagged.
- `npm test`: passed, 39/39 tests, including strict TypeScript builds and the
  analyzer and built-CLI regressions.
- `npm run lint`: passed.
- `git diff --check`: passed.
- `node dist/cli.js scan test/fixtures/destructuring-assignment --json`: exited 1
  with fifteen client-boundary findings, as expected.
