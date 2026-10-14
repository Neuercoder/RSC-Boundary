# Assignment taint for compound and logical assignments (2026-10-14)

## Status

Implemented and locally verified.

## Scope delivered

- Propagate RHS taint for `&&=` and `||=` to identifier, property-access, and element-access targets, matching existing `=` / `??=` behavior.
- Support element-access targets for `+=` as well.
- Make assignment expressions return taint: `=` uses only its RHS; `+=`, `??=`, `&&=`, and `||=` conservatively inspect left then right, following the existing `+`, `??`, `&&`, and `||` expression behavior.
- Preserve the existing monotonic fixpoint model. Add a neutral-name `assignment-taint` fixture and analyzer and CLI regression tests.

## Limits and non-goals

No control-flow feasibility is modeled, and clean overwrites do not clear taint. Indexed element accesses are keyed by exact text; aliases and enhanced destructuring-assignment behavior are not covered. Cross-module type-aware dataflow remains outside this milestone.

## Verification results

- `npm test`: passed, 37/37 tests (including three new assignment-taint tests).
- `npm run lint`: passed.
- `git diff --check`: passed.
- `node dist/cli.js scan test/fixtures/assignment-taint --json`: exited 1 with exactly nine boundary findings, as expected. The clean RHS assignment-expression case and sibling index remained clean.
- Regression evidence: before the fix, the new CLI test expected nine findings but observed one.

`npm test` includes the strict TypeScript build and test compilation.
